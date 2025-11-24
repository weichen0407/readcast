import express from 'express';
import { getArticleById } from '../services/articleService.js';
import { analyzeStoryline } from '../agents/storylineAgent.js';
import { analyzeSentiment } from '../agents/sentimentAgent.js';
import { extractEntities } from '../agents/entityAgent.js';
import { understandContext } from '../agents/contextAgent.js';
import { answerQuestion } from '../agents/qaAgent.js';
import { getDatabase } from '../db/database.js';

const router = express.Router();
const db = getDatabase();

// 分析故事线
router.post('/storyline', async (req, res) => {
  try {
    const { text, articleId } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    let articleContext;
    if (articleId) {
      const article = getArticleById(articleId);
      articleContext = { title: article.title, content: article.content };
    }

    const result = await analyzeStoryline(text, articleContext);
    res.json({ result: JSON.stringify(result, null, 2) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to analyze storyline'
    });
  }
});

// 情感分析
router.post('/sentiment', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await analyzeSentiment(text);
    res.json({ result: JSON.stringify(result, null, 2) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to analyze sentiment'
    });
  }
});

// 实体提取
router.post('/entities', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await extractEntities(text);
    res.json({ result: JSON.stringify(result, null, 2) });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to extract entities'
    });
  }
});

// 上下文理解
router.post('/context', async (req, res) => {
  try {
    const { text, articleId } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    let keywords: string[] = [];
    let fullArticle: string | undefined;

    if (articleId) {
      const article = getArticleById(articleId);
      fullArticle = article.content;

      // 尝试从数据库获取关键词
      const keywordStmt = db.prepare('SELECT keywords FROM article_keywords WHERE articleId = ?');
      const keywordRow = keywordStmt.get(articleId) as { keywords: string } | undefined;
      if (keywordRow) {
        try {
          const parsed = JSON.parse(keywordRow.keywords);
          keywords = parsed.keywords || [];
        } catch (e) {
          // Ignore parse error
        }
      }
    }

    const result = await understandContext(text, keywords, fullArticle);
    res.json({ result });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to understand context'
    });
  }
});

// 问答（流式输出）
router.post('/qa', async (req, res) => {
  try {
    const { question, articleId, context } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    let articleContext: { title?: string; content?: string } = {};
    
    if (articleId) {
      const article = getArticleById(articleId);
      articleContext = {
        title: article.title,
        content: article.content
      };
    }

    // 如果有额外的上下文信息，添加到prompt中
    let enhancedQuestion = question;
    if (context) {
      try {
        const ctx = typeof context === 'string' ? JSON.parse(context) : context;
        if (ctx.summary) {
          enhancedQuestion = `文章总结：${ctx.summary}\n\n${question}`;
        }
        if (ctx.keywords && ctx.keywords.length > 0) {
          enhancedQuestion = `${enhancedQuestion}\n\n关键词：${ctx.keywords.join(', ')}`;
        }
        if (ctx.selectedText) {
          enhancedQuestion = `${enhancedQuestion}\n\n选中的文本：${ctx.selectedText}`;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }

    // 设置流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 使用流式输出
    const { answerQuestionStream } = await import('../agents/qaAgent.js');
    const stream = await answerQuestionStream(enhancedQuestion, articleContext);
    
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to answer question'
    });
  }
});

export default router;

