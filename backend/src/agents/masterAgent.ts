import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';
import { summarizeSportsArticle, SportsSummary } from './sportsSummaryAgent.js';
import { extractPoliticsTimeline, PoliticsTimeline } from './politicsTimelineAgent.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.2,
});

export type ArticleType = 'sports' | 'politics' | 'general';

export interface ArticleAnalysis {
  type: ArticleType;
  sportsSummary?: SportsSummary;
  politicsTimeline?: PoliticsTimeline;
  generalSummary?: string;
}

export async function analyzeArticleType(title: string, content: string): Promise<ArticleType> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a news classifier. Determine if the article is about sports (NBA, football, etc.) or politics. Return only "sports", "politics", or "general".'],
    ['human', `Title: {title}
Content preview: {content}

Classify this article.`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ 
    title, 
    content: content.substring(0, 1000) 
  });
  
  const type = (response.content as string).toLowerCase().trim();
  if (type.includes('sports') || type.includes('sport')) {
    return 'sports';
  } else if (type.includes('politic')) {
    return 'politics';
  }
  return 'general';
}

export async function analyzeArticle(title: string, content: string): Promise<ArticleAnalysis> {
  // First, determine article type
  const type = await analyzeArticleType(title, content);
  
  const result: ArticleAnalysis = { type };
  
  // Route to appropriate agent
  if (type === 'sports') {
    result.sportsSummary = await summarizeSportsArticle(title, content);
  } else if (type === 'politics') {
    result.politicsTimeline = await extractPoliticsTimeline(title, content);
  } else {
    // General summary
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'You are a news summarizer. Provide a concise summary of the article in Chinese, including main points and key information.'],
      ['human', `Title: {title}
Content: {content}

Please summarize this article.`]
    ]);
    
    const chain = prompt.pipe(model);
    const response = await chain.invoke({ title, content: content.substring(0, 3000) });
    result.generalSummary = response.content as string;
  }
  
  return result;
}

