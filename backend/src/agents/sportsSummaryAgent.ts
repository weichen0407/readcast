import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.3,
});

export interface SportsSummary {
  theme: string;
  background: string;
  keyEvents: string[];
  terminology: { term: string; explanation: string }[];
  sportType: string;
}

export async function summarizeSportsArticle(
  title: string,
  content: string
): Promise<SportsSummary> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a sports news analyst specializing in NBA, football (soccer), and other major sports. 
Analyze the article and provide:
1. Main theme and topic
2. Background context (teams, players, situation)
3. Key events mentioned
4. Professional terminology with explanations
5. Sport type (NBA, Football/Soccer, etc.)

Return your response as a JSON object with this structure:
{{
  "theme": "main theme",
  "background": "background context",
  "keyEvents": ["event1", "event2"],
  "terminology": [{{"term": "term1", "explanation": "explanation1"}}],
  "sportType": "NBA/Football/etc"
}}`],
    ['human', `Title: {title}

Content:
{content}

Please analyze this sports article.`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ title, content });
  
  try {
    const contentStr = response.content as string;
    // Try to extract JSON from response
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SportsSummary;
    }
    // Fallback: return as structured text
    return {
      theme: contentStr,
      background: '',
      keyEvents: [],
      terminology: [],
      sportType: 'Unknown'
    };
  } catch (error) {
    // If JSON parsing fails, return the raw response
    return {
      theme: response.content as string,
      background: '',
      keyEvents: [],
      terminology: [],
      sportType: 'Unknown'
    };
  }
}

