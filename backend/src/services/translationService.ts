import { translateText as translateTextAgent } from '../agents/translationAgent.js';
import { explainText as explainTextAgent } from '../agents/explanationAgent.js';
import { Article } from '../models/Article.js';

export async function translateText(text: string, article: Article): Promise<string> {
  return await translateTextAgent(text, {
    title: article.title,
    content: article.content
  });
}

export async function explainText(text: string, article: Article): Promise<string> {
  return await explainTextAgent(text, {
    title: article.title,
    content: article.content,
    type: article.type || undefined
  });
}

