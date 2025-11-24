import express from 'express';
import { fetchNews } from '../services/newsService.js';
import { createArticle } from '../services/articleService.js';

const router = express.Router();

// 获取新闻列表
router.get('/fetch', async (req, res) => {
  try {
    const category = req.query.category as 'sports' | 'politics' | 'technology' | 'business' | 'science' | 'entertainment' | 'all' | undefined;
    const source = req.query.source as 'guardian' | 'hackernews' | 'reddit' | 'all' | undefined;
    const count = req.query.count ? parseInt(req.query.count as string) : 10;

    const articles = await fetchNews({ category, count, source: source || 'all' });
    res.json(articles);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch news'
    });
  }
});

// 获取新闻并保存到数据库
router.post('/fetch-and-save', async (req, res) => {
  try {
    const { category, count, source } = req.body;
    const newsArticles = await fetchNews({ 
      category, 
      count: count || 10,
      source: source || 'all'
    });

    const savedArticles = [];
    for (const newsArticle of newsArticles) {
      try {
        // 清理HTML标签（Guardian API返回的body可能包含HTML）
        const cleanContent = newsArticle.content
          .replace(/<[^>]*>/g, '') // 移除HTML标签
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (!cleanContent || cleanContent.length < 50) {
          console.warn(`Skipping article with insufficient content: ${newsArticle.title}`);
          continue;
        }
        
        // 将新闻API的category映射为type
        // 如果category是'all'，则不设置type，让AI分类（如果需要）
        const articleType = newsArticle.category && newsArticle.category !== 'all' 
          ? newsArticle.category 
          : undefined;
        
        const article = await createArticle({
          title: newsArticle.title,
          content: cleanContent,
          url: newsArticle.url,
          source: newsArticle.source,
          type: articleType // 传入从新闻API获取的分类
        });
        savedArticles.push(article);
      } catch (error) {
        console.error('Failed to save article:', error);
      }
    }

    res.json({
      fetched: newsArticles.length,
      saved: savedArticles.length,
      articles: savedArticles
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch and save news'
    });
  }
});

export default router;

