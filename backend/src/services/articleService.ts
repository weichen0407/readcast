import { getDatabase } from '../db/database.js';
import { Article } from '../models/Article.js';
import { parseArticleFromUrl, parseArticleFromText } from './articleParser.js';

const db = getDatabase();

export async function createArticle(input: { content?: string; url?: string; title?: string; source?: string; type?: string }): Promise<Article> {
  let parsedContent: { title: string; content: string; source?: string };
  
  // 如果同时提供了content和url，优先使用content（比如从新闻API获取的数据）
  if (input.content) {
    parsedContent = parseArticleFromText(input.content, input.title);
    if (input.source) {
      parsedContent.source = input.source;
    }
  } else if (input.url) {
    parsedContent = await parseArticleFromUrl(input.url);
  } else {
    throw new Error('Either content or url must be provided');
  }
  
  // 如果没有source，标记为"导入"
  const source = parsedContent.source || (input.url || input.content ? '导入' : null);
  
  const stmt = db.prepare(`
    INSERT INTO articles (title, content, url, source, type)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // 如果提供了type，直接使用；否则设为null，后续可能通过AI分类
  const articleType = input.type || null;
  
  const result = stmt.run(
    parsedContent.title,
    parsedContent.content,
    input.url || null,
    source,
    articleType
  );
  
  const articleId = result.lastInsertRowid as number;
  const article = getArticleById(articleId);
  
  // 不再在创建时自动分类
  // 分类将在用户使用"总结文章"或"提取关键词"功能时自动触发
  // 这样更节省API调用，且分类更准确（因为AI已经理解了文章内容）
  
  return article;
}

// 异步分类文章
async function classifyArticleAsync(articleId: number, title: string, content: string) {
  try {
    const { classifyArticleType } = await import('../agents/articleClassifierAgent.js');
    const category = await classifyArticleType(title, content);
    
    if (category) {
      updateArticle(articleId, { type: category });
    }
  } catch (error) {
    console.error('Failed to classify article:', error);
  }
}

export function getArticleById(id: number): Article {
  const stmt = db.prepare('SELECT * FROM articles WHERE id = ?');
  const article = stmt.get(id) as Article;
  
  if (!article) {
    throw new Error('Article not found');
  }
  
  return article;
}

export function getAllArticles(): Article[] {
  const stmt = db.prepare('SELECT * FROM articles ORDER BY createdAt DESC');
  return stmt.all() as Article[];
}

export function deleteArticle(id: number): void {
  const stmt = db.prepare('DELETE FROM articles WHERE id = ?');
  const result = stmt.run(id);
  
  if (result.changes === 0) {
    throw new Error('Article not found');
  }
}

export function updateArticle(id: number, updates: Partial<Article>): Article {
  const fields: string[] = [];
  const values: any[] = [];
  
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.content !== undefined) {
    fields.push('content = ?');
    values.push(updates.content);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.summary !== undefined) {
    fields.push('summary = ?');
    values.push(updates.summary);
  }
  if (updates.timeline !== undefined) {
    fields.push('timeline = ?');
    values.push(updates.timeline);
  }
  
  fields.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE articles SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  return getArticleById(id);
}

