import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.5,
});

export async function explainText(
  text: string, 
  articleContext: { title?: string; content?: string; type?: string }
): Promise<string> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an expert English teacher and content explainer. Explain the given text in detail, considering:
1. The context of the article (${articleContext.type || 'general'} news)
2. Key vocabulary and phrases
3. Cultural or background information if relevant
4. Professional terminology if it's a specialized article
Provide your explanation in Chinese, making it clear and educational.`],
    ['human', `Article context:
Title: ${articleContext.title || 'N/A'}
Type: ${articleContext.type || 'general'}
Content preview: ${articleContext.content?.substring(0, 1000) || 'N/A'}

Please explain the following text in detail:
{text}`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ text });
  
  return response.content as string;
}

