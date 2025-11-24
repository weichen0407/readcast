import axios from 'axios';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['contentSnippet']
  }
});

export interface NewsArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt?: string;
  category?: string;
}

export interface NewsFetchOptions {
  category?: 'sports' | 'politics' | 'technology' | 'business' | 'science' | 'entertainment' | 'all';
  count?: number;
  source?: 'guardian' | 'hackernews' | 'reddit' | 'all';
}

// The Guardian API (免费，无需key)
async function fetchFromGuardian(options: NewsFetchOptions): Promise<NewsArticle[]> {
  try {
    const categoryMap: Record<string, string> = {
      sports: 'sport',
      politics: 'politics',
      technology: 'technology',
      business: 'business',
    };

    const section = options.category && options.category !== 'all' 
      ? categoryMap[options.category] || 'world'
      : 'world';

    const response = await axios.get('https://content.guardianapis.com/search', {
      params: {
        'section': section,
        'page-size': options.count || 10,
        'show-fields': 'body,trailText',
        'api-key': 'test', // Guardian允许使用'test'作为开发key
        'format': 'json'
      }
    });

    const articles: NewsArticle[] = response.data.response.results
      .filter((item: any) => {
        // 只返回有内容的文章
        const hasContent = item.fields?.body || item.fields?.trailText;
        return hasContent && item.webTitle;
      })
      .map((item: any) => ({
        title: item.webTitle,
        content: item.fields?.body || item.fields?.trailText || '',
        url: item.webUrl,
        source: 'The Guardian',
        publishedAt: item.webPublicationDate,
        category: options.category || 'all'
      }));

    return articles;
  } catch (error) {
    console.error('Guardian API error:', error);
    return [];
  }
}


// Hacker News API (免费，无需key)
async function fetchFromHackerNews(options: NewsFetchOptions): Promise<NewsArticle[]> {
  try {
    // Hacker News API获取热门文章
    const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json');
    const topStoryIds = response.data.slice(0, options.count || 10);
    
    // 获取每篇文章的详细信息
    const articlePromises = topStoryIds.map((id: number) =>
      axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
    );
    
    const articleResponses = await Promise.all(articlePromises);
    
    const articles: NewsArticle[] = articleResponses
      .map((res: any) => res.data)
      .filter((item: any) => item && item.title && item.url)
      .map((item: any) => ({
        title: item.title || '',
        content: item.text || item.title || '',
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        source: 'Hacker News',
        publishedAt: new Date(item.time * 1000).toISOString(),
        category: 'technology' // Hacker News主要是科技类
      }));

    return articles;
  } catch (error) {
    console.error('Hacker News API error:', error);
    return [];
  }
}

// Reddit API (免费，无需key)
async function fetchFromReddit(options: NewsFetchOptions): Promise<NewsArticle[]> {
  try {
    const subredditMap: Record<string, string> = {
      sports: 'sports',
      politics: 'politics',
      technology: 'technology',
      business: 'business',
      science: 'science',
      entertainment: 'entertainment',
      all: 'all'
    };

    const subreddit = options.category && options.category !== 'all'
      ? subredditMap[options.category] || 'all'
      : 'all';

    let url = 'https://www.reddit.com/r/all/hot.json';
    if (subreddit !== 'all') {
      url = `https://www.reddit.com/r/${subreddit}/hot.json`;
    }

    const response = await axios.get(url, {
      params: {
        limit: options.count || 10
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsReader/1.0)'
      }
    });

    const articles: NewsArticle[] = response.data.data.children
      .filter((item: any) => item.data && item.data.title && !item.data.stickied)
      .map((item: any) => ({
        title: item.data.title,
        content: item.data.selftext || item.data.title,
        url: item.data.url.startsWith('http') ? item.data.url : `https://www.reddit.com${item.data.permalink}`,
        source: `Reddit r/${item.data.subreddit}`,
        publishedAt: new Date(item.data.created_utc * 1000).toISOString(),
        category: options.category || 'all'
      }));

    return articles;
  } catch (error) {
    console.error('Reddit API error:', error);
    return [];
  }
}

// 主函数：获取新闻
export async function fetchNews(options: NewsFetchOptions = {}): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];
  const source = options.source || 'all';

  // 根据数据源选择获取新闻
  if (source === 'guardian' || source === 'all') {
    const guardianArticles = await fetchFromGuardian(options);
    articles.push(...guardianArticles);
  }

  if (source === 'hackernews' || source === 'all') {
    const hnArticles = await fetchFromHackerNews(options);
    articles.push(...hnArticles);
  }

  if (source === 'reddit' || source === 'all') {
    const redditArticles = await fetchFromReddit(options);
    articles.push(...redditArticles);
  }

  // 去重（基于URL）
  const uniqueArticles = articles.filter((article, index, self) =>
    index === self.findIndex(a => a.url === article.url)
  );

  return uniqueArticles.slice(0, options.count || 20);
}

