import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.2,
});

export interface KeywordsResult {
  keywords: string[];
  categories: string[];
}

export async function extractKeywords(
  title: string,
  content: string
): Promise<KeywordsResult> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a keyword extraction expert. Extract the most important keywords and categorize them from the given article.
Return your response as a JSON object with this structure:
{{
  "keywords": ["keyword1", "keyword2", ...],
  "categories": ["category1", "category2", ...]
}}
Keywords should be important terms, names, concepts mentioned in the article.
Categories should be the main topics or themes.`],
    ['human', `Title: {title}

Content:
{content}

Please extract keywords and categories from this article.`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ 
    title, 
    content: content.substring(0, 6000) 
  });
  
  try {
    const contentStr = response.content as string;
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as KeywordsResult;
    }
    // Fallback
    return {
      keywords: contentStr.split(',').slice(0, 10).map(k => k.trim()),
      categories: []
    };
  } catch (error) {
    return {
      keywords: [],
      categories: []
    };
  }
}

