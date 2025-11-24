import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 在 Railway 上使用 /tmp，本地使用项目目录
const dbPath = process.env.DATABASE_PATH || 
  (process.env.NODE_ENV === 'production' 
    ? '/tmp/read.db' 
    : path.join(__dirname, '../../db/read.db'));

let db: Database.Database;

export function initDatabase(): Database.Database {
  try {
    console.log(`📂 Database path: ${dbPath}`);
    db = new Database(dbPath);
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT NOT NULL,
      url TEXT,
      source TEXT,
      type TEXT,
      summary TEXT,
      timeline TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleId INTEGER NOT NULL,
      userId TEXT DEFAULT 'default',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(articleId, userId)
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleId INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorite_sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleId INTEGER,
      userId TEXT DEFAULT 'default',
      sentence TEXT NOT NULL,
      originalSentence TEXT,
      explanation TEXT,
      agentType TEXT,
      tags TEXT,
      agentResults TEXT,
      highlightColor TEXT DEFAULT '#ffeb3b',
      sentenceStart INTEGER,
      sentenceEnd INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS article_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleId INTEGER NOT NULL,
      keywords TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE CASCADE,
      UNIQUE(articleId)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(type);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(userId);
    CREATE INDEX IF NOT EXISTS idx_favorite_sentences_article ON favorite_sentences(articleId);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // 数据库迁移：添加缺失的列
  migrateDatabase(db);
  
  console.log('Database initialized');
  return db;
}

function migrateDatabase(db: Database.Database) {
  try {
    // 检查 favorite_sentences 表是否存在，以及是否有 highlightColor 列
    const tableInfo = db.prepare("PRAGMA table_info(favorite_sentences)").all() as Array<{ name: string; type: string }>;
    const columnNames = tableInfo.map(col => col.name);
    
    // 添加缺失的列
    if (!columnNames.includes('highlightColor')) {
      console.log('Adding highlightColor column to favorite_sentences table...');
      db.exec('ALTER TABLE favorite_sentences ADD COLUMN highlightColor TEXT DEFAULT "#ffeb3b"');
    }
    
    if (!columnNames.includes('sentenceStart')) {
      console.log('Adding sentenceStart column to favorite_sentences table...');
      db.exec('ALTER TABLE favorite_sentences ADD COLUMN sentenceStart INTEGER');
    }
    
    if (!columnNames.includes('sentenceEnd')) {
      console.log('Adding sentenceEnd column to favorite_sentences table...');
      db.exec('ALTER TABLE favorite_sentences ADD COLUMN sentenceEnd INTEGER');
    }
    
    if (!columnNames.includes('notes')) {
      console.log('Adding notes column to favorite_sentences table (will be migrated to tags)...');
      db.exec('ALTER TABLE favorite_sentences ADD COLUMN notes TEXT');
    }
    
    if (!columnNames.includes('tags')) {
      console.log('Adding tags column to favorite_sentences table...');
      db.exec('ALTER TABLE favorite_sentences ADD COLUMN tags TEXT');
    }
    
    if (!columnNames.includes('agentResults')) {
      console.log('Adding agentResults column to favorite_sentences table...');
      db.exec('ALTER TABLE favorite_sentences ADD COLUMN agentResults TEXT');
    }
    
    if (!columnNames.includes('originalSentence')) {
      console.log('Adding originalSentence column to favorite_sentences table...');
      db.exec('ALTER TABLE favorite_sentences ADD COLUMN originalSentence TEXT');
    }
    
    if (!columnNames.includes('userId')) {
      console.log('Adding userId column to favorite_sentences table...');
      db.exec('ALTER TABLE favorite_sentences ADD COLUMN userId TEXT DEFAULT "default"');
    }
    
    // 迁移notes到tags（如果notes有值但tags为空）
    try {
      const migrationStmt = db.prepare('UPDATE favorite_sentences SET tags = notes WHERE (tags IS NULL OR tags = "") AND notes IS NOT NULL AND notes != ""');
      const migrationResult = migrationStmt.run();
      if (migrationResult.changes > 0) {
        console.log(`Migrated ${migrationResult.changes} notes to tags`);
      }
    } catch (e) {
      // 忽略迁移错误
    }
    
    // 检查 favorite_notes 表是否存在
    try {
      const notesTableInfo = db.prepare("PRAGMA table_info(favorite_notes)").all() as Array<{ name: string; type: string }>;
      if (notesTableInfo.length === 0) {
        console.log('Creating favorite_notes table...');
        db.exec(`
          CREATE TABLE IF NOT EXISTS favorite_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            favoriteSentenceId INTEGER,
            note TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (favoriteSentenceId) REFERENCES favorite_sentences(id) ON DELETE CASCADE
          );
        `);
      }
    } catch (error) {
      // 表不存在，创建它
      console.log('Creating favorite_notes table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS favorite_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          favoriteSentenceId INTEGER,
          note TEXT NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (favoriteSentenceId) REFERENCES favorite_sentences(id) ON DELETE CASCADE
        );
      `);
    }
    
    // 检查并创建users表（如果不存在）
    try {
      const usersTableInfo = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string; type: string }>;
      if (usersTableInfo.length === 0) {
        console.log('Creating users table...');
        db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'user',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        `);
      }
    } catch (error) {
      console.error('Error creating users table:', error);
    }
    
    // 预设admin账号（异步执行，不阻塞初始化）
    setTimeout(async () => {
      try {
        const bcrypt = await import('bcrypt');
        const adminCheck = db.prepare('SELECT id FROM users WHERE username = ?').get('jerry') as { id: number } | undefined;
        if (!adminCheck) {
          // 创建新管理员账号
          const hashedPassword = await bcrypt.hash('123123', 10);
          const result = db.prepare(`
            INSERT INTO users (username, password, role, email)
            VALUES (?, ?, 'admin', ?)
          `).run('jerry', hashedPassword, 'wbh2000v@outlook.com');
          const jerryId = result.lastInsertRowid;
          console.log(`Admin user "jerry" created with ID ${jerryId}, password "123123" and email "wbh2000v@outlook.com"`);
          
          // 将旧的'default'收藏迁移到jerry账号
          if (jerryId) {
            const updateResult = db.prepare('UPDATE favorite_sentences SET userId = ? WHERE userId = "default"').run(jerryId.toString());
            if (updateResult.changes > 0) {
              console.log(`Migrated ${updateResult.changes} favorite sentences from 'default' to jerry (ID: ${jerryId})`);
            }
          }
        } else {
          // 如果账号已存在，更新邮箱和角色（确保是admin）
          db.prepare(`
            UPDATE users 
            SET email = ?, role = 'admin' 
            WHERE username = 'jerry'
          `).run('wbh2000v@outlook.com');
          console.log('Admin user "jerry" email updated to "wbh2000v@outlook.com"');
          
          // 将旧的'default'收藏迁移到jerry账号
          const updateResult = db.prepare('UPDATE favorite_sentences SET userId = ? WHERE userId = "default"').run(adminCheck.id.toString());
          if (updateResult.changes > 0) {
            console.log(`Migrated ${updateResult.changes} favorite sentences from 'default' to jerry (ID: ${adminCheck.id})`);
          }
        }
      } catch (error) {
        console.error('Error creating/updating admin user:', error);
      }
    }, 100);
    
    // 创建 readcast_documents 表
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS readcast_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          articleId INTEGER,
          userId TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          language TEXT DEFAULT 'bilingual',
          customRequirements TEXT,
          documentContent TEXT,
          pdfPath TEXT,
          podcastPath TEXT,
          podcastMode TEXT,
          podcastScript TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (articleId) REFERENCES articles(id) ON DELETE SET NULL
        );
      `);
      console.log('readcast_documents table created/verified');
      
      // 检查并添加缺失的列（如果表已存在但没有该列）
      const readcastTableInfo = db.prepare("PRAGMA table_info(readcast_documents)").all() as Array<{ name: string; type: string }>;
      const readcastColumnNames = readcastTableInfo.map(col => col.name);
      if (!readcastColumnNames.includes('language')) {
        console.log('Adding language column to readcast_documents table...');
        db.exec('ALTER TABLE readcast_documents ADD COLUMN language TEXT DEFAULT "bilingual"');
      }
      if (!readcastColumnNames.includes('podcastScript')) {
        console.log('Adding podcastScript column to readcast_documents table...');
        db.exec('ALTER TABLE readcast_documents ADD COLUMN podcastScript TEXT');
      }
    } catch (error) {
      console.error('Error creating readcast_documents table:', error);
    }
    
    console.log('Database migration completed');
  } catch (error) {
    console.error('Database migration error:', error);
    // 不抛出错误，允许应用继续运行
  }
}

export function getDatabase(): Database.Database {
  if (!db) {
    initDatabase();
  }
  return db;
}

