import express from 'express';
import { getDatabase } from '../db/database.js';
import { getArticleById } from '../services/articleService.js';
import { generateArticleDocument, generateFavoritesDocument, DifficultyLevel, ReadCastDocument } from '../agents/readcastAgent.js';
import { generatePDF, PDFMetadata } from '../services/pdfService.js';
import { exportToJSON, exportToMarkdown, ExportMetadata } from '../services/documentExportService.js';
import { generatePodcastScript, PodcastMode } from '../agents/podcastScriptAgent.js';
import { generatePodcastAudio } from '../services/ttsService.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

// 辅助函数：从请求中获取userId
function getUserId(req: AuthRequest): string {
  if (req.user && req.user.userId) {
    return req.user.userId.toString();
  }
  console.warn('Warning: req.user not found, using default userId');
  return 'default';
}
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const db = getDatabase();

// 确保存储目录存在
const documentsDir = path.join(__dirname, '../../storage/documents');
const podcastsDir = path.join(__dirname, '../../storage/podcasts');

async function ensureDirectories() {
  try {
    await fs.mkdir(documentsDir, { recursive: true });
    await fs.mkdir(podcastsDir, { recursive: true });
  } catch (error) {
    console.error('Error creating storage directories:', error);
  }
}

// 初始化时创建目录
ensureDirectories();

/**
 * 获取文档历史列表
 */
router.get('/article/:articleId/documents', authenticate, async (req: AuthRequest, res) => {
  try {
    const { articleId } = req.params;
    const userId = getUserId(req);

    const documents = db.prepare(`
      SELECT id, difficulty, language, customRequirements, pdfPath, podcastPath, createdAt
      FROM readcast_documents 
      WHERE type = 'article' 
        AND articleId = ? 
        AND userId = ?
      ORDER BY createdAt DESC
    `).all(articleId, userId) as any[];

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        difficulty: doc.difficulty,
        language: doc.language || 'bilingual',
        customRequirements: doc.customRequirements,
        pdfUrl: doc.pdfPath ? `/api/readcast/download/document/${doc.pdfPath}` : null,
        podcastUrl: doc.podcastPath ? `/api/readcast/download/podcast/${doc.podcastPath}` : null,
        createdAt: doc.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching document history:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch document history'
    });
  }
});

/**
 * 获取文档详情（用于查看之前的文档）
 */
router.get('/document/:documentId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId } = req.params;
    const userId = getUserId(req);

    const doc = db.prepare(`
      SELECT * FROM readcast_documents 
      WHERE id = ? AND userId = ?
    `).get(documentId, userId) as any;

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = JSON.parse(doc.documentContent);

    res.json({
      success: true,
      documentId: doc.id,
      document,
      pdfUrl: doc.pdfPath ? `/api/readcast/download/document/${doc.pdfPath}` : null,
      podcastUrl: doc.podcastPath ? `/api/readcast/download/podcast/${doc.podcastPath}` : null,
      difficulty: doc.difficulty,
      language: doc.language || 'bilingual',
      customRequirements: doc.customRequirements,
      createdAt: doc.createdAt
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch document'
    });
  }
});

/**
 * 生成文章文档
 */
router.post('/article/generate', authenticate, async (req: AuthRequest, res) => {
  try {
    const { articleId, difficulty, language, customRequirements, forceNew, format } = req.body;
    const userId = getUserId(req);
    
    // 支持的格式：pdf, json, md，默认为pdf
    const exportFormat = (format || 'pdf').toLowerCase();
    if (!['pdf', 'json', 'md'].includes(exportFormat)) {
      return res.status(400).json({ error: 'Invalid format. Must be pdf, json, or md' });
    }

    console.log('Generating article document:', { articleId, difficulty, userId });

    if (!articleId) {
      return res.status(400).json({ error: 'articleId is required' });
    }

    if (!difficulty || !['low', 'medium', 'high'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty. Must be low, medium, or high' });
    }

    // 获取文章
    let article;
    try {
      article = getArticleById(articleId);
    } catch (err) {
      console.error('Error getting article:', err);
      return res.status(404).json({ error: 'Article not found' });
    }

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    console.log('Article found, checking for existing document...');

    // 检查是否已有相同参数的文档（包括 language）
    const languageParam = (language || 'bilingual') as string;
    let existingDoc: any = null;
    
    // 如果 forceNew 为 true，跳过查找已存在的文档
    if (!forceNew) {
      existingDoc = db.prepare(`
        SELECT * FROM readcast_documents 
        WHERE type = 'article' 
          AND articleId = ? 
          AND userId = ? 
          AND difficulty = ? 
          AND language = ?
          AND (customRequirements = ? OR (customRequirements IS NULL AND ? IS NULL))
          AND documentContent IS NOT NULL
        ORDER BY createdAt DESC
        LIMIT 1
      `).get(
        articleId, 
        userId, 
        difficulty,
        languageParam,
        customRequirements || null, 
        customRequirements || null
      ) as any;
    }

    let document: ReadCastDocument;
    let documentId: number;
    let fileUrl: string | null = null;
    let filePath: string | null = null;

    if (existingDoc && existingDoc.documentContent) {
      // 使用已存在的文档
      console.log('Using existing document, ID:', existingDoc.id);
      document = JSON.parse(existingDoc.documentContent);
      documentId = existingDoc.id;
      
      // 根据格式返回对应的文件URL
      if (exportFormat === 'pdf' && existingDoc.pdfPath) {
        fileUrl = `/api/readcast/download/document/${existingDoc.pdfPath}`;
      } else if (exportFormat === 'json') {
        // JSON格式直接返回，不需要文件
        fileUrl = null;
      } else if (exportFormat === 'md') {
        // MD格式需要生成
        const metadata: ExportMetadata = {
          title: document.title,
          articleTitle: article.title || undefined,
          difficulty,
          type: 'article',
          generatedAt: new Date(existingDoc.createdAt),
          language: languageParam
        };
        const mdContent = await exportToMarkdown(document, metadata);
        const timestamp = Date.now();
        const filename = `article_${articleId}_${userId}_${timestamp}.md`;
        const filepath = path.join(documentsDir, filename);
        await fs.writeFile(filepath, mdContent, 'utf-8');
        fileUrl = `/api/readcast/download/document/${filename}`;
      }
    } else {
      // 生成新文档
      console.log('Generating new document...');
      try {
        document = await generateArticleDocument(
          article.title || 'Untitled',
          article.content,
          difficulty as DifficultyLevel,
          customRequirements,
          article.type || undefined,
          (language || 'bilingual') as 'bilingual' | 'english'
        );
        console.log('Document generated successfully');

        const metadata: ExportMetadata = {
          title: document.title,
          articleTitle: article.title || undefined,
          difficulty,
          type: 'article',
          generatedAt: new Date(),
          language: languageParam
        };

        // 根据格式生成文件
        const timestamp = Date.now();
        let filename: string;
        let fileContent: Buffer | string;

        if (exportFormat === 'pdf') {
          const pdfMetadata: PDFMetadata = {
            title: document.title,
            articleTitle: article.title || undefined,
            difficulty,
            type: 'article',
            generatedAt: new Date()
          };
          fileContent = await generatePDF(document, pdfMetadata);
          filename = `article_${articleId}_${userId}_${timestamp}.pdf`;
        } else if (exportFormat === 'json') {
          fileContent = await exportToJSON(document, metadata);
          filename = `article_${articleId}_${userId}_${timestamp}.json`;
        } else if (exportFormat === 'md') {
          fileContent = await exportToMarkdown(document, metadata);
          filename = `article_${articleId}_${userId}_${timestamp}.md`;
        } else {
          throw new Error(`Unsupported format: ${exportFormat}`);
        }

        const filepath = path.join(documentsDir, filename);
        
        // 保存文件
        if (exportFormat === 'pdf') {
          await fs.writeFile(filepath, fileContent as Buffer);
        } else {
          await fs.writeFile(filepath, fileContent as string, 'utf-8');
        }
        console.log(`${exportFormat.toUpperCase()} file saved:`, filename);
        
        // 保存到数据库
        const stmt = db.prepare(`
          INSERT INTO readcast_documents (type, articleId, userId, difficulty, language, customRequirements, documentContent, pdfPath)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
          'article',
          articleId,
          userId,
          difficulty,
          languageParam,
          customRequirements || null,
          JSON.stringify(document),
          exportFormat === 'pdf' ? filename : null // 只有PDF保存路径
        );

        documentId = Number(result.lastInsertRowid);
        fileUrl = `/api/readcast/download/document/${filename}`;
        filePath = filename;
        console.log('Document saved to database, ID:', documentId);
      } catch (err) {
        console.error('Error generating document:', err);
        return res.status(500).json({ 
          error: `Failed to generate ${exportFormat.toUpperCase()} document`,
          details: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // 返回文档
    const response: any = {
      success: true,
      documentId,
      document,
      format: exportFormat
    };

    if (exportFormat === 'json') {
      // JSON格式直接返回内容
      const metadata: ExportMetadata = {
        title: document.title,
        articleTitle: article.title || undefined,
        difficulty,
        type: 'article',
        generatedAt: new Date(),
        language: languageParam
      };
      response.jsonContent = await exportToJSON(document, metadata);
    } else {
      response.fileUrl = fileUrl;
    }

    res.json(response);
  } catch (error) {
    console.error('Unexpected error generating article document:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate document',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * 生成收藏文档
 */
router.post('/favorites/generate', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, favoriteIds, difficulty, language, customRequirements, format } = req.body;
    const userId = getUserId(req);
    
    // 支持的格式：pdf, json, md，默认为pdf
    const exportFormat = (format || 'pdf').toLowerCase();
    if (!['pdf', 'json', 'md'].includes(exportFormat)) {
      return res.status(400).json({ error: 'Invalid format. Must be pdf, json, or md' });
    }

    if (!type || !['today', 'selected'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be today or selected' });
    }

    if (!difficulty || !['low', 'medium', 'high'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty. Must be low, medium, or high' });
    }

    // 获取收藏内容
    let favorites: any[] = [];
    if (type === 'today') {
      // 获取今日收藏
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const stmt = db.prepare(`
        SELECT fs.*, a.title as articleTitle
        FROM favorite_sentences fs
        LEFT JOIN articles a ON fs.articleId = a.id
        WHERE fs.userId = ? AND DATE(fs.createdAt) = DATE(?)
        ORDER BY fs.createdAt DESC
      `);
      favorites = stmt.all(userId, today.toISOString()) as any[];
    } else if (type === 'selected' && favoriteIds && Array.isArray(favoriteIds)) {
      // 获取选中的收藏
      const placeholders = favoriteIds.map(() => '?').join(',');
      const stmt = db.prepare(`
        SELECT fs.*, a.title as articleTitle
        FROM favorite_sentences fs
        LEFT JOIN articles a ON fs.articleId = a.id
        WHERE fs.id IN (${placeholders}) AND fs.userId = ?
        ORDER BY fs.createdAt DESC
      `);
      favorites = stmt.all(...favoriteIds, userId) as any[];
    }

    if (favorites.length === 0) {
      return res.status(400).json({ error: 'No favorites found' });
    }

    // 格式化收藏数据
    const favoriteData = favorites.map(fav => ({
      sentence: fav.sentence,
      originalSentence: fav.originalSentence,
      explanation: fav.explanation,
      tags: fav.tags,
      articleTitle: fav.articleTitle
    }));

    // 检查是否已有相同参数的文档（对于收藏文档，匹配类型、难度、语言和自定义要求）
    const languageParam = (language || 'bilingual') as string;
    const existingDoc = db.prepare(`
      SELECT * FROM readcast_documents 
      WHERE type = 'favorites' 
        AND userId = ? 
        AND difficulty = ? 
        AND language = ?
        AND (customRequirements = ? OR (customRequirements IS NULL AND ? IS NULL))
        AND documentContent IS NOT NULL
      ORDER BY createdAt DESC
      LIMIT 1
    `).get(
      userId, 
      difficulty,
      languageParam,
      customRequirements || null, 
      customRequirements || null
    ) as any;

    let document: ReadCastDocument;
    let documentId: number;
    let fileUrl: string | null = null;

    if (existingDoc && existingDoc.documentContent) {
      // 使用已存在的文档
      console.log('Using existing document, ID:', existingDoc.id);
      document = JSON.parse(existingDoc.documentContent);
      documentId = existingDoc.id;
      
      // 根据格式返回对应的文件URL
      if (exportFormat === 'pdf' && existingDoc.pdfPath) {
        fileUrl = `/api/readcast/download/document/${existingDoc.pdfPath}`;
      } else if (exportFormat === 'json') {
        // JSON格式直接返回，不需要文件
        fileUrl = null;
      } else if (exportFormat === 'md') {
        // MD格式需要生成
        const metadata: ExportMetadata = {
          title: document.title,
          difficulty,
          type: 'favorites',
          generatedAt: new Date(existingDoc.createdAt),
          language: languageParam
        };
        const mdContent = await exportToMarkdown(document, metadata);
        const timestamp = Date.now();
        const filename = `favorites_${type}_${userId}_${timestamp}.md`;
        const filepath = path.join(documentsDir, filename);
        await fs.writeFile(filepath, mdContent, 'utf-8');
        fileUrl = `/api/readcast/download/document/${filename}`;
      }
    } else {
      // 生成新文档
      console.log('Generating new document...');
      document = await generateFavoritesDocument(
        favoriteData,
        difficulty as DifficultyLevel,
        customRequirements,
        type,
        (language || 'bilingual') as 'bilingual' | 'english'
      );

      const metadata: ExportMetadata = {
        title: document.title,
        difficulty,
        type: 'favorites',
        generatedAt: new Date(),
        language: languageParam
      };

      // 根据格式生成文件
      const timestamp = Date.now();
      let filename: string;
      let fileContent: Buffer | string;

      if (exportFormat === 'pdf') {
        const pdfMetadata: PDFMetadata = {
          title: document.title,
          difficulty,
          type: 'favorites',
          generatedAt: new Date()
        };
        fileContent = await generatePDF(document, pdfMetadata);
        filename = `favorites_${type}_${userId}_${timestamp}.pdf`;
      } else if (exportFormat === 'json') {
        fileContent = await exportToJSON(document, metadata);
        filename = `favorites_${type}_${userId}_${timestamp}.json`;
      } else if (exportFormat === 'md') {
        fileContent = await exportToMarkdown(document, metadata);
        filename = `favorites_${type}_${userId}_${timestamp}.md`;
      } else {
        throw new Error(`Unsupported format: ${exportFormat}`);
      }

      const filepath = path.join(documentsDir, filename);
      
      // 保存文件
      if (exportFormat === 'pdf') {
        await fs.writeFile(filepath, fileContent as Buffer);
      } else {
        await fs.writeFile(filepath, fileContent as string, 'utf-8');
      }
      console.log(`${exportFormat.toUpperCase()} file saved:`, filename);

      // 保存到数据库
      const stmt = db.prepare(`
        INSERT INTO readcast_documents (type, articleId, userId, difficulty, language, customRequirements, documentContent, pdfPath)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        'favorites',
        null,
        userId,
        difficulty,
        languageParam,
        customRequirements || null,
        JSON.stringify(document),
        exportFormat === 'pdf' ? filename : null // 只有PDF保存路径
      );

      documentId = Number(result.lastInsertRowid);
      fileUrl = `/api/readcast/download/document/${filename}`;
      console.log('Document saved to database, ID:', documentId);
    }

    // 返回文档
    const response: any = {
      success: true,
      documentId,
      document,
      format: exportFormat
    };

    if (exportFormat === 'json') {
      // JSON格式直接返回内容
      const metadata: ExportMetadata = {
        title: document.title,
        difficulty,
        type: 'favorites',
        generatedAt: new Date(),
        language: languageParam
      };
      response.jsonContent = await exportToJSON(document, metadata);
    } else {
      response.fileUrl = fileUrl;
    }

    res.json(response);
  } catch (error) {
    console.error('Error generating favorites document:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate document'
    });
  }
});

/**
 * 生成播客脚本（第一步）
 */
router.post('/article/podcast/script', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId, documentContent, mode, language } = req.body;
    const userId = getUserId(req);

    if (!mode || !['solo', 'dialogue'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be solo or dialogue' });
    }

    // 获取文档内容
    let document: ReadCastDocument;
    if (documentId) {
      const doc = db.prepare('SELECT * FROM readcast_documents WHERE id = ? AND userId = ?').get(documentId, userId) as any;
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      document = JSON.parse(doc.documentContent);
    } else if (documentContent) {
      document = JSON.parse(documentContent);
    } else {
      return res.status(400).json({ error: 'documentId or documentContent is required' });
    }

    // 生成播客脚本
    const script = await generatePodcastScript(
      document, 
      mode as PodcastMode,
      (language || 'bilingual') as 'bilingual' | 'english'
    );

    // 保存脚本到数据库
    if (documentId) {
      const scriptJson = JSON.stringify(script);
      db.prepare(`
        UPDATE readcast_documents 
        SET podcastMode = ?, podcastScript = ?
        WHERE id = ? AND userId = ?
      `).run(mode, scriptJson, documentId, userId);
    }

    res.json({
      success: true,
      script
    });
  } catch (error) {
    console.error('Error generating podcast script:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate podcast script'
    });
  }
});

/**
 * 生成播客音频（第二步）
 */
router.post('/article/podcast/audio', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId, script, mode } = req.body;
    const userId = getUserId(req);

    if (!script) {
      return res.status(400).json({ error: 'script is required' });
    }

    // 生成音频
    const filename = await generatePodcastAudio(script, podcastsDir);

    // 更新数据库
    if (documentId) {
      db.prepare(`
        UPDATE readcast_documents 
        SET podcastPath = ?, podcastMode = ?
        WHERE id = ? AND userId = ?
      `).run(filename, mode || script.mode, documentId, userId);
    }

    res.json({
      success: true,
      podcastUrl: `/api/readcast/download/podcast/${filename}`
    });
  } catch (error) {
    console.error('Error generating podcast audio:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate podcast audio'
    });
  }
});

/**
 * 生成文章播客（兼容旧接口，先生成脚本再生成音频）
 */
router.post('/article/podcast', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId, documentContent, mode, language } = req.body;
    const userId = getUserId(req);

    if (!mode || !['solo', 'dialogue'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be solo or dialogue' });
    }

    // 获取文档内容
    let document: ReadCastDocument;
    if (documentId) {
      const doc = db.prepare('SELECT * FROM readcast_documents WHERE id = ? AND userId = ?').get(documentId, userId) as any;
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      document = JSON.parse(doc.documentContent);
    } else if (documentContent) {
      document = JSON.parse(documentContent);
    } else {
      return res.status(400).json({ error: 'documentId or documentContent is required' });
    }

    // 生成播客脚本
    const script = await generatePodcastScript(
      document, 
      mode as PodcastMode,
      (language || 'bilingual') as 'bilingual' | 'english'
    );

    // 生成音频
    const filename = await generatePodcastAudio(script, podcastsDir);

    // 更新数据库
    if (documentId) {
      db.prepare(`
        UPDATE readcast_documents 
        SET podcastPath = ?, podcastMode = ?
        WHERE id = ? AND userId = ?
      `).run(filename, mode, documentId, userId);
    }

    res.json({
      success: true,
      script,
      podcastUrl: `/api/readcast/download/podcast/${filename}`
    });
  } catch (error) {
    console.error('Error generating podcast:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate podcast'
    });
  }
});

/**
 * 生成收藏播客
 */
router.post('/favorites/podcast', authenticate, async (req: AuthRequest, res) => {
  try {
    const { documentId, documentContent, mode, language } = req.body;
    const userId = getUserId(req);

    if (!mode || !['solo', 'dialogue'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be solo or dialogue' });
    }

    // 获取文档内容
    let document: ReadCastDocument;
    if (documentId) {
      const doc = db.prepare('SELECT * FROM readcast_documents WHERE id = ? AND userId = ?').get(documentId, userId) as any;
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      document = JSON.parse(doc.documentContent);
    } else if (documentContent) {
      document = JSON.parse(documentContent);
    } else {
      return res.status(400).json({ error: 'documentId or documentContent is required' });
    }

    // 生成播客脚本
    const script = await generatePodcastScript(
      document, 
      mode as PodcastMode,
      (language || 'bilingual') as 'bilingual' | 'english'
    );

    // 生成音频
    const filename = await generatePodcastAudio(script, podcastsDir);

    // 更新数据库
    if (documentId) {
      db.prepare(`
        UPDATE readcast_documents 
        SET podcastPath = ?, podcastMode = ?
        WHERE id = ? AND userId = ?
      `).run(filename, mode, documentId, userId);
    }

    res.json({
      success: true,
      podcastUrl: `/api/readcast/download/podcast/${filename}`
    });
  } catch (error) {
    console.error('Error generating favorites podcast:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate podcast'
    });
  }
});

/**
 * 下载文件
 */
router.get('/download/:type/:filename', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, filename } = req.params;
    const userId = getUserId(req);

    console.log('Download request:', { type, filename, userId });

    if (!['document', 'podcast'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // 验证文件属于当前用户
    if (type === 'document') {
      // 检查pdfPath或通过文件名匹配（因为现在支持多种格式）
      const ext = path.extname(filename).toLowerCase();
      let doc: any = null;
      
      if (ext === '.pdf') {
        // PDF文件，检查pdfPath
        doc = db.prepare('SELECT * FROM readcast_documents WHERE pdfPath = ? AND userId = ?').get(filename, userId) as any;
      } else {
        // JSON或MD文件，通过文件名匹配（文件名包含userId）
        // 文件名格式：article_articleId_userId_timestamp.ext 或 favorites_type_userId_timestamp.ext
        if (filename.includes(`_${userId}_`)) {
          // 文件名包含userId，允许下载（简单验证）
          doc = { userId }; // 创建一个虚拟文档对象
        }
      }
      
      console.log('Document check result:', doc ? 'found' : 'not found');
      if (!doc) {
        return res.status(404).json({ error: 'File not found or access denied' });
      }
    } else if (type === 'podcast') {
      const doc = db.prepare('SELECT * FROM readcast_documents WHERE podcastPath = ? AND userId = ?').get(filename, userId) as any;
      console.log('Podcast check result:', doc ? 'found' : 'not found');
      if (!doc) {
        return res.status(404).json({ error: 'File not found or access denied' });
      }
    }

    // 构建文件路径
    const dir = type === 'document' ? documentsDir : podcastsDir;
    const filepath = path.join(dir, filename);
    console.log('File path:', filepath);

    // 检查文件是否存在
    try {
      await fs.access(filepath);
      console.log('File exists');
    } catch (err) {
      console.error('File access error:', err);
      return res.status(404).json({ 
        error: 'File not found',
        details: `File path: ${filepath}`
      });
    }

    // 设置响应头
    const ext = path.extname(filename).toLowerCase();
    let contentType: string;
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.json') {
      contentType = 'application/json';
    } else if (ext === '.md') {
      contentType = 'text/markdown';
    } else if (ext === '.mp3') {
      contentType = 'audio/mpeg';
    } else {
      contentType = 'application/octet-stream';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    // 读取并发送文件
    const fileBuffer = await fs.readFile(filepath);
    console.log('File read successfully, size:', fileBuffer.length);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to download file',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

export default router;

