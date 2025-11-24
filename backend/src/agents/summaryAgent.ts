import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.3,
});

export async function summarizeArticle(
  title: string,
  content: string
): Promise<string> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are an expert news summarizer. Provide a concise and comprehensive summary of the article in Chinese, including main points, key information, and important details.'],
    ['human', `Title: {title}

Content:
{content}

Please provide a comprehensive summary of this article in Chinese.`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ title, content: content.substring(0, 8000) });
  
  return response.content as string;
}

