import * as cheerio from 'cheerio';
import axios from 'axios';

export interface ParsedArticle {
  title: string;
  content: string;
  source?: string;
}

export async function parseArticleFromUrl(url: string, retries: number = 3): Promise<ParsedArticle> {
  const maxRetries = retries;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 检测是否是CNN等可能阻止爬虫的网站
      const isStrictSite = url.includes('cnn.com') || 
                          url.includes('nytimes.com') || 
                          url.includes('washingtonpost.com') ||
                          url.includes('bbc.com');
      
      // 为严格网站使用更真实的请求头
      const headers: Record<string, string> = isStrictSite ? {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Referer': 'https://www.google.com/',
      } : {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      };
      
      const response = await axios.get(url, {
        headers,
        timeout: isStrictSite ? 45000 : 30000, // 严格网站给更长的超时时间
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        // 对于严格网站，不自动解压，让axios处理
        decompress: true,
      });
      
      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, footer, header, aside, .advertisement, .ad, .ads, .advertisement-container').remove();
      
      // Remove common non-content elements
      $('.sidebar, .widget, .related-posts, .comments, .comment-section, .social-share, .share-buttons').remove();
      
      // Try to find title
      let title = $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="twitter:title"]').attr('content') ||
                  $('title').text() || 
                  $('h1').first().text() || 
                  '';
      
      // Try to find main content
      // Common article selectors (ordered by specificity)
      const contentSelectors = [
        'article .article-body',
        'article .post-content',
        'article .entry-content',
        'article .content',
        '[role="article"] .content',
        '.article-content',
        '.post-content',
        '.entry-content',
        '.article-body',
        'article',
        '[role="article"]',
        '.content',
        'main',
        '.main-content',
        '#content',
        '#main-content'
      ];
      
      let content = '';
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          // Get text but preserve paragraph structure
          content = element.find('p').map((_, el) => $(el).text().trim()).get()
            .filter(p => p.length > 20) // Filter out very short paragraphs
            .join('\n\n');
          
          if (content.length > 200) {
            break;
          }
        }
      }
      
      // Fallback: get all paragraph text
      if (!content || content.length < 200) {
        content = $('p').map((_, el) => {
          const text = $(el).text().trim();
          return text.length > 20 ? text : '';
        }).get()
          .filter(p => p.length > 0)
          .join('\n\n')
          .trim();
      }
      
      // Additional fallback: try to get text from body
      if (!content || content.length < 200) {
        $('script, style, nav, footer, header, aside, .advertisement, .ad, .ads').remove();
        content = $('body').text().trim();
      }
      
      // Clean up content but preserve paragraph structure
      content = content
        .replace(/\[.*?\]/g, '') // Remove [image], [video] etc
        .replace(/\(.*?图片.*?\)/gi, '') // Remove Chinese image references
        .replace(/\(.*?图.*?\)/gi, '')
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines to double newlines
        .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space, but keep newlines
        .trim();
      
      if (!content || content.length < 50) {
        throw new Error('Extracted content is too short or empty');
      }
      
      return {
        title: title.trim() || 'Untitled Article',
        content,
        source: new URL(url).hostname
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        break;
      }
      
      // 等待后重试（指数退避）
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} for URL: ${url}`);
    }
  }
  
  // 如果所有重试都失败，提供更友好的错误信息
  const errorMessage = lastError?.message || 'Unknown error';
  let userFriendlyMessage = '无法解析文章URL';
  let suggestion = '请尝试直接粘贴文章内容，或检查URL是否正确';
  
  // 检测是否是CNN等严格网站
  const isStrictSite = url.includes('cnn.com') || 
                      url.includes('nytimes.com') || 
                      url.includes('washingtonpost.com');
  
  if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT')) {
    if (isStrictSite) {
      userFriendlyMessage = '该网站（CNN/NYT等）可能阻止了自动访问';
      suggestion = '建议：1) 打开文章页面，复制全文内容；2) 在"导入新闻"中选择"文本"标签；3) 粘贴内容后点击"AI解析文章"进行清理';
    } else {
      userFriendlyMessage = '网络连接失败，请检查URL是否正确或稍后重试';
    }
  } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
    userFriendlyMessage = '无法访问该URL，请检查网络连接';
  } else if (errorMessage.includes('timeout')) {
    userFriendlyMessage = '请求超时，请稍后重试';
    if (isStrictSite) {
      suggestion = '该网站响应较慢，建议直接复制文章内容粘贴导入';
    }
  } else if (errorMessage.includes('404')) {
    userFriendlyMessage = '文章不存在（404错误）';
  } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
    userFriendlyMessage = '访问被拒绝，该网站可能阻止了自动访问';
    suggestion = '建议直接复制文章内容，使用"文本导入"功能';
  }
  
  const error = new Error(`${userFriendlyMessage}: ${errorMessage}`);
  (error as any).suggestion = suggestion;
  (error as any).isStrictSite = isStrictSite;
  throw error;
}

export function parseArticleFromText(text: string, title?: string): ParsedArticle {
  return {
    title: title || 'Untitled Article',
    content: text.trim()
  };
}

