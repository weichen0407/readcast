import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.3,
});

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // 0-1
  explanation: string;
}

export async function analyzeSentiment(
  text: string
): Promise<SentimentResult> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a sentiment analysis expert. Analyze the sentiment of the given text.
Return your response as a JSON object with this structure:
{{
  "sentiment": "positive" | "negative" | "neutral",
  "score": 0.0-1.0,
  "explanation": "detailed explanation in Chinese"
}}`],
    ['human', `Text to analyze:
{text}

Please analyze the sentiment.`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ text });
  
  try {
    const contentStr = response.content as string;
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SentimentResult;
    }
    // Fallback
    return {
      sentiment: 'neutral',
      score: 0.5,
      explanation: contentStr
    };
  } catch (error) {
    return {
      sentiment: 'neutral',
      score: 0.5,
      explanation: response.content as string
    };
  }
}

