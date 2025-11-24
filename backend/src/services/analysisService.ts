import { analyzeArticle, ArticleAnalysis } from '../agents/masterAgent.js';
import { getArticleById, updateArticle } from './articleService.js';
import { getDatabase } from '../db/database.js';

const db = getDatabase();

export async function analyzeArticleService(articleId: number): Promise<ArticleAnalysis & { articleId: number }> {
  const article = getArticleById(articleId);
  
  const analysis = await analyzeArticle(
    article.title || 'Untitled',
    article.content
  );
  
  // Update article with type and summary/timeline
  const updates: any = { type: analysis.type };
  
  if (analysis.sportsSummary) {
    updates.summary = JSON.stringify(analysis.sportsSummary);
  } else if (analysis.politicsTimeline) {
    updates.timeline = JSON.stringify(analysis.politicsTimeline);
  } else if (analysis.generalSummary) {
    updates.summary = analysis.generalSummary;
  }
  
  updateArticle(articleId, updates);
  
  // Store analysis in database
  const stmt = db.prepare(`
    INSERT INTO analyses (articleId, type, content)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(
    articleId,
    analysis.type,
    JSON.stringify(analysis)
  );
  
  return { ...analysis, articleId };
}

