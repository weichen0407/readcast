import express from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { getAllUsers, getUserById } from '../services/authService.js';
import { getDatabase } from '../db/database.js';

const router = express.Router();
const db = getDatabase();

// 所有管理员路由都需要认证和admin权限
router.use(authenticate);
router.use(requireAdmin);

// 获取所有用户
router.get('/users', (req: AuthRequest, res) => {
  try {
    const users = getAllUsers();
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch users'
    });
  }
});

// 获取用户详情
router.get('/users/:id', (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = getUserById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch user'
    });
  }
});

// 获取用户的收藏文章
router.get('/users/:id/favorites', (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    const favorites = db.prepare(`
      SELECT f.*, a.title, a.source, a.type, a.createdAt as articleCreatedAt
      FROM favorites f
      LEFT JOIN articles a ON f.articleId = a.id
      WHERE f.userId = ?
      ORDER BY f.createdAt DESC
    `).all(userId);
    
    res.json({ favorites, count: favorites.length });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch favorites'
    });
  }
});

// 获取用户的收藏句子
router.get('/users/:id/favorite-sentences', (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    // 注意：favorite_sentences表目前没有userId字段，需要先添加
    // 这里先返回所有收藏句子，后续可以添加userId字段
    const sentences = db.prepare(`
      SELECT fs.*, a.title as articleTitle, a.source
      FROM favorite_sentences fs
      LEFT JOIN articles a ON fs.articleId = a.id
      ORDER BY fs.createdAt DESC
    `).all();
    
    res.json({ sentences, count: sentences.length });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch favorite sentences'
    });
  }
});

// 获取所有收藏文章统计
router.get('/statistics/favorites', (req: AuthRequest, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalFavorites,
        COUNT(DISTINCT userId) as uniqueUsers,
        COUNT(DISTINCT articleId) as uniqueArticles
      FROM favorites
    `).get() as { totalFavorites: number; uniqueUsers: number; uniqueArticles: number };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch statistics'
    });
  }
});

// 获取所有收藏句子统计
router.get('/statistics/favorite-sentences', (req: AuthRequest, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalSentences,
        COUNT(DISTINCT articleId) as uniqueArticles
      FROM favorite_sentences
    `).get() as { totalSentences: number; uniqueArticles: number };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch statistics'
    });
  }
});

// 获取用户注册统计
router.get('/statistics/users', (req: AuthRequest, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as adminUsers,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as regularUsers
      FROM users
    `).get() as { totalUsers: number; adminUsers: number; regularUsers: number };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch statistics'
    });
  }
});

export default router;

