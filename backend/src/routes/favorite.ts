import express from 'express';
import { getDatabase } from '../db/database.js';
import { getArticleById } from '../services/articleService.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const db = getDatabase();

// 辅助函数：从请求中获取userId（优先从token，否则使用default）
function getUserId(req: AuthRequest): string {
  if (req.user && req.user.userId) {
    // 返回用户ID的字符串形式，确保类型一致
    return req.user.userId.toString();
  }
  // 如果没有用户信息，返回'default'（理论上不应该发生，因为已经通过authenticate中间件）
  console.warn('Warning: req.user not found, using default userId');
  return 'default';
}

// Get all favorites
router.get('/', authenticate, (req: AuthRequest, res) => {
  try {
    const userId = getUserId(req);
    const stmt = db.prepare(`
      SELECT a.*, f.createdAt as favoritedAt
      FROM favorites f
      JOIN articles a ON f.articleId = a.id
      WHERE f.userId = ?
      ORDER BY f.createdAt DESC
    `);
    const favorites = stmt.all(userId);
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch favorites' 
    });
  }
});

// Get favorite sentences (必须在 /:articleId 之前)
router.get('/sentences', authenticate, (req: AuthRequest, res) => {
  try {
    const articleId = req.query.articleId ? parseInt(req.query.articleId as string) : undefined;
    const userId = getUserId(req);
    
    console.log('=== Favorite Sentences Query ===');
    console.log('Request user:', req.user);
    console.log('Extracted userId:', userId, 'type:', typeof userId);
    console.log('articleId:', articleId);
    
    // 先查询所有收藏，看看数据库中的userId格式
    const allSentences = db.prepare('SELECT id, userId, sentence FROM favorite_sentences').all();
    console.log('All sentences in DB:', allSentences);
    console.log('All userIds in DB:', allSentences.map((s: any) => ({ id: s.id, userId: s.userId, userIdType: typeof s.userId })));
    
    // 确保userId是trimmed的字符串
    const trimmedUserId = String(userId).trim();
    console.log('Using trimmed userId for query:', trimmedUserId, 'type:', typeof trimmedUserId);
    
    // 测试直接查询
    const testQuery = db.prepare('SELECT id, userId FROM favorite_sentences WHERE userId = ?').all(trimmedUserId);
    console.log('Direct test query result:', testQuery);
    
    let stmt;
    if (articleId) {
      stmt = db.prepare(`
        SELECT fs.*, a.title as articleTitle, a.url as articleUrl
        FROM favorite_sentences fs
        LEFT JOIN articles a ON fs.articleId = a.id
        WHERE fs.articleId = ? AND TRIM(CAST(fs.userId AS TEXT)) = ?
        ORDER BY fs.createdAt DESC
      `);
    } else {
      // 直接使用字符串匹配，SQLite会自动处理类型转换
      stmt = db.prepare(`
        SELECT fs.*, a.title as articleTitle, a.url as articleUrl
        FROM favorite_sentences fs
        LEFT JOIN articles a ON fs.articleId = a.id
        WHERE fs.userId = ?
        ORDER BY fs.createdAt DESC
      `);
    }
    
    // 执行查询
    const testResult = articleId ? stmt.all(articleId, trimmedUserId) : stmt.all(trimmedUserId);
    console.log('Query result count:', testResult.length);
    console.log('Query result:', testResult);
    
    const sentences = testResult.map((s: any) => {
      // 解析agentResults JSON字符串
      if (s.agentResults && typeof s.agentResults === 'string') {
        try {
          s.agentResults = JSON.parse(s.agentResults);
        } catch (e) {
          s.agentResults = null;
        }
      }
      return s;
    });
    
    console.log(`Found ${sentences.length} favorite sentences for userId: ${userId}`);
    res.json(sentences);
  } catch (error) {
    console.error('Error fetching favorite sentences:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch favorite sentences',
      details: error instanceof Error ? error.stack : undefined
    });
  }
});

// Add favorite sentence (必须在 /:articleId 之前)
router.post('/sentences', authenticate, (req: AuthRequest, res) => {
  try {
    const { articleId, sentence, originalSentence, explanation, agentType, tags, agentResults, highlightColor, sentenceStart, sentenceEnd } = req.body;
    const userId = getUserId(req);
    
    if (!sentence) {
      return res.status(400).json({ error: 'Sentence is required' });
    }

    // 如果提供了 articleId，验证它是否存在
    let validArticleId: number | null = null;
    if (articleId !== undefined && articleId !== null && articleId !== '') {
      const articleIdNum = typeof articleId === 'string' ? parseInt(articleId) : articleId;
      if (!isNaN(articleIdNum) && articleIdNum > 0) {
        try {
          // 验证文章是否存在
          getArticleById(articleIdNum);
          validArticleId = articleIdNum;
        } catch (error: any) {
          // 如果文章不存在，仍然允许收藏句子（不关联文章）
          // 不抛出错误，只是记录警告
          console.warn(`Article ${articleIdNum} not found, saving sentence without article association:`, error?.message || 'Unknown error');
          validArticleId = null;
        }
      } else {
        // articleId 无效（NaN 或 <= 0），设置为 null
        validArticleId = null;
      }
    }

    // 将agentResults转换为JSON字符串存储
    const agentResultsJson = agentResults ? JSON.stringify(agentResults) : null;
    // 将tags转换为字符串（如果是数组）
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');

    const stmt = db.prepare(`
      INSERT INTO favorite_sentences (articleId, userId, sentence, originalSentence, explanation, agentType, tags, agentResults, highlightColor, sentenceStart, sentenceEnd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      validArticleId,
      userId,
      sentence,
      originalSentence || null,
      explanation || null,
      agentType || null,
      tagsStr || null,
      agentResultsJson,
      highlightColor || '#ffeb3b',
      sentenceStart || null,
      sentenceEnd || null
    );

    res.json({
      id: result.lastInsertRowid,
      articleId: validArticleId,
      sentence,
      originalSentence: originalSentence || null,
      explanation,
      agentType,
      tags: tagsStr,
      agentResults: agentResults || null,
      highlightColor: highlightColor || '#ffeb3b'
    });
  } catch (error: any) {
    console.error('Error saving favorite sentence:', error);
    // 确保错误信息不会暴露 "Article not found"，因为我们已经处理了这种情况
    const errorMessage = error?.message || 'Failed to save favorite sentence';
    // 即使出现其他错误，也尝试返回成功（因为文章验证已经通过）
    res.status(500).json({
      error: errorMessage.includes('Article not found') 
        ? 'Failed to save favorite sentence (article may not exist)' 
        : errorMessage
    });
  }
});

// Toggle favorite
router.post('/:articleId', authenticate, (req: AuthRequest, res) => {
  try {
    const articleId = parseInt(req.params.articleId);
    const userId = getUserId(req);
    
    if (isNaN(articleId) || articleId <= 0) {
      return res.status(400).json({ error: 'Invalid article ID' });
    }
    
    // Check if article exists
    try {
      getArticleById(articleId);
    } catch (error) {
      return res.status(404).json({ 
        error: error instanceof Error ? error.message : 'Article not found' 
      });
    }
    
    // Check if already favorited
    const checkStmt = db.prepare('SELECT id FROM favorites WHERE articleId = ? AND userId = ?');
    const existing = checkStmt.get(articleId, userId);
    
    if (existing) {
      // Remove favorite
      const deleteStmt = db.prepare('DELETE FROM favorites WHERE articleId = ? AND userId = ?');
      deleteStmt.run(articleId, userId);
      res.json({ favorited: false });
    } else {
      // Add favorite
      const insertStmt = db.prepare('INSERT INTO favorites (articleId, userId) VALUES (?, ?)');
      insertStmt.run(articleId, userId);
      res.json({ favorited: true });
    }
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to toggle favorite' 
    });
  }
});

// Check if article is favorited
router.get('/:articleId/status', authenticate, (req: AuthRequest, res) => {
  try {
    const articleId = parseInt(req.params.articleId);
    const userId = getUserId(req);
    
    const stmt = db.prepare('SELECT id FROM favorites WHERE articleId = ? AND userId = ?');
    const result = stmt.get(articleId, userId);
    
    res.json({ favorited: !!result });
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to check favorite status' 
    });
  }
});

// Update favorite sentence tags
router.put('/sentences/:id/tags', authenticate, (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = getUserId(req);
    const { tags } = req.body;
    
    if (!tags) {
      return res.status(400).json({ error: 'Tags are required' });
    }
    
    const tagsStr = Array.isArray(tags) ? tags.join(',') : (tags || '');
    // 确保只能更新自己的收藏
    const stmt = db.prepare('UPDATE favorite_sentences SET tags = ? WHERE id = ? AND userId = ?');
    const result = stmt.run(tagsStr, id, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Favorite not found or not authorized' });
    }
    
    res.json({ success: true, tags: tagsStr });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update tags'
    });
  }
});

// Update favorite sentence notes
router.put('/sentences/:id/notes', authenticate, (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = getUserId(req);
    const { notes } = req.body;
    
    // 确保只能更新自己的收藏
    const stmt = db.prepare('UPDATE favorite_sentences SET notes = ? WHERE id = ? AND userId = ?');
    const result = stmt.run(notes || '', id, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Favorite not found or not authorized' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update notes'
    });
  }
});

// Delete favorite sentence
router.delete('/sentences/:id', authenticate, (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = getUserId(req);
    // 确保只能删除自己的收藏
    const stmt = db.prepare('DELETE FROM favorite_sentences WHERE id = ? AND userId = ?');
    const result = stmt.run(id, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Favorite not found or not authorized' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete favorite'
    });
  }
});


export default router;

