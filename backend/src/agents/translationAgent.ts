import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.3,
});

export async function translateText(text: string, articleContext?: { title?: string; content?: string }): Promise<string> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a professional translator. Translate the given English text to Chinese accurately, maintaining the original meaning and tone.'],
    ['human', `Article context:
Title: ${articleContext?.title || 'N/A'}
Content preview: ${articleContext?.content?.substring(0, 500) || 'N/A'}

Please translate the following text to Chinese:
{text}`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ text });
  
  return response.content as string;
}

