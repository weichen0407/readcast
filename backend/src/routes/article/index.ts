import express from 'express';
import { createArticle, getArticleById, getAllArticles } from '../../services/articleService.js';
import { analyzeArticleService } from '../../services/analysisService.js';
import { translateText, explainText } from '../../services/translationService.js';
import { summarizeArticle } from '../../agents/summaryAgent.js';
import { extractKeywords } from '../../agents/keywordAgent.js';
import { cleanArticleContent } from '../../agents/articleCleanerAgent.js';
import { getDatabase } from '../../db/database.js';

const db = getDatabase();

const router = express.Router();

// Create article from text or URL
router.post('/', async (req, res) => {
  try {
    const { content, url, title } = req.body;
    const article = await createArticle({ content, url, title });
    res.json(article);
  } catch (error) {
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to create article' 
    });
  }
});

// Get article by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const article = getArticleById(id);
    res.json(article);
  } catch (error) {
    res.status(404).json({ 
      error: error instanceof Error ? error.message : 'Article not found' 
    });
  }
});

// Get all articles
router.get('/', (req, res) => {
  try {
    const articles = getAllArticles();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch articles' 
    });
  }
});

// Delete article
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { deleteArticle } = await import('../../services/articleService.js');
    deleteArticle(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to delete article' 
    });
  }
});

// Analyze article (summary or timeline)
router.post('/:id/analyze', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await analyzeArticleService(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to analyze article' 
    });
  }
});

// Translate selected text
router.post('/:id/translate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const article = getArticleById(id);
    const translation = await translateText(text, article);
    res.json({ translation });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to translate text' 
    });
  }
});

// Explain selected text
router.post('/:id/explain', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const article = getArticleById(id);
    const explanation = await explainText(text, article);
    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to explain text' 
    });
  }
});

// Summarize article
router.post('/:id/summary', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const article = getArticleById(id);
    const summary = await summarizeArticle(
      article.title || 'Untitled',
      article.content
    );
    
    // 如果文章还没有分类，自动分类
    if (!article.type) {
      try {
        const { classifyArticleType } = await import('../../agents/articleClassifierAgent.js');
        const { updateArticle } = await import('../../services/articleService.js');
        const category = await classifyArticleType(
          article.title || 'Untitled',
          article.content
        );
        if (category) {
          updateArticle(id, { type: category });
        }
      } catch (classifyError) {
        // 分类失败不影响总结功能，只记录错误
        console.error('Failed to auto-classify article after summary:', classifyError);
      }
    }
    
    res.json({ summary });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to summarize article'
    });
  }
});

// Extract keywords
router.post('/:id/keywords', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const article = getArticleById(id);
    const keywords = await extractKeywords(
      article.title || 'Untitled',
      article.content
    );
    
    // Save keywords to database
    const stmt = db.prepare('INSERT OR REPLACE INTO article_keywords (articleId, keywords) VALUES (?, ?)');
    stmt.run(id, JSON.stringify(keywords));
    
    // 如果文章还没有分类，自动分类
    if (!article.type) {
      try {
        const { classifyArticleType } = await import('../../agents/articleClassifierAgent.js');
        const { updateArticle } = await import('../../services/articleService.js');
        const category = await classifyArticleType(
          article.title || 'Untitled',
          article.content
        );
        if (category) {
          updateArticle(id, { type: category });
        }
      } catch (classifyError) {
        // 分类失败不影响关键词提取功能，只记录错误
        console.error('Failed to auto-classify article after keywords extraction:', classifyError);
      }
    }
    
    res.json({ keywords });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to extract keywords'
    });
  }
});

// AI解析和清理文章内容
router.post('/clean', async (req, res) => {
  try {
    const { content, url, title } = req.body;
    
    console.log('Clean request received:', { 
      hasContent: !!content, 
      hasUrl: !!url, 
      contentLength: content?.length || 0,
      url: url 
    });
    
    if (!content && !url) {
      return res.status(400).json({ 
        error: 'Either content or url must be provided',
        suggestion: '请提供文章内容或URL'
      });
    }

    let rawContent = content;
    let articleTitle = title;

    // 如果提供了URL，先解析URL获取内容
    if (url && !content) {
      try {
        const { parseArticleFromUrl } = await import('../../services/articleParser.js');
        const parsed = await parseArticleFromUrl(url);
        rawContent = parsed.content;
        articleTitle = parsed.title || title;
      } catch (parseError: any) {
        // 如果URL解析失败，返回友好的错误信息
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
        const suggestion = parseError.suggestion || '请尝试直接粘贴文章内容，或检查URL是否正确';
        const isStrictSite = parseError.isStrictSite || false;
        
        return res.status(400).json({ 
          error: `无法从URL获取文章内容: ${errorMessage}`,
          suggestion: suggestion,
          isStrictSite: isStrictSite,
          alternative: isStrictSite ? '该网站可能阻止自动访问，建议使用文本导入功能' : undefined
        });
      }
    }

    if (!rawContent) {
      return res.status(400).json({ 
        error: '文章内容为空，无法处理',
        suggestion: '请确保提供了有效的文章内容'
      });
    }

    const trimmedContent = rawContent.trim();
    if (trimmedContent.length < 20) {
      return res.status(400).json({ 
        error: '文章内容太短，无法处理',
        suggestion: '请确保文章内容至少包含20个字符'
      });
    }

    // 使用AI清理文章内容
    try {
      const cleaned = await cleanArticleContent(rawContent, articleTitle);
      res.json(cleaned);
    } catch (cleanError) {
      console.error('AI clean error:', cleanError);
      const errorMessage = cleanError instanceof Error ? cleanError.message : 'Unknown error';
      
      // 如果AI清理失败，返回原始内容（至少保证能导入）
      res.json({
        title: articleTitle || 'Untitled Article',
        content: rawContent.substring(0, 10000), // 限制长度
        removedElements: [],
        warning: `AI清理失败，使用原始内容: ${errorMessage}`
      });
    }
  } catch (error) {
    console.error('Article clean route error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: `处理失败: ${errorMessage}`,
      suggestion: '请稍后重试，或尝试手动编辑文章内容'
    });
  }
});

export default router;

