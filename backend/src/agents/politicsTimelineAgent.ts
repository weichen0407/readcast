import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.3,
});

export interface TimelineEvent {
  date?: string;
  event: string;
  description: string;
}

export interface PoliticsTimeline {
  timeline: TimelineEvent[];
  keyFigures: string[];
  locations: string[];
  summary: string;
}

export async function extractPoliticsTimeline(
  title: string,
  content: string
): Promise<PoliticsTimeline> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a political news analyst. Analyze the article and extract:
1. Timeline of events in chronological order
2. Key figures mentioned
3. Important locations
4. Overall summary

Return your response as a JSON object with this structure:
{{
  "timeline": [
    {{"date": "date if mentioned", "event": "event name", "description": "description"}},
    ...
  ],
  "keyFigures": ["figure1", "figure2"],
  "locations": ["location1", "location2"],
  "summary": "overall summary"
}}`],
    ['human', `Title: {title}

Content:
{content}

Please extract the timeline and key information from this political news article.`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ title, content });
  
  try {
    const contentStr = response.content as string;
    // Try to extract JSON from response
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as PoliticsTimeline;
    }
    // Fallback
    return {
      timeline: [],
      keyFigures: [],
      locations: [],
      summary: contentStr
    };
  } catch (error) {
    return {
      timeline: [],
      keyFigures: [],
      locations: [],
      summary: response.content as string
    };
  }
}

