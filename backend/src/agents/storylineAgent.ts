import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.4,
});

export interface StorylineResult {
  storyline: string;
  relationships: Array<{
    entity1: string;
    entity2: string;
    relationship: string;
  }>;
  background: string;
}

export async function analyzeStoryline(
  text: string,
  articleContext?: { title?: string; content?: string }
): Promise<StorylineResult> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a story analyst expert. Analyze the storyline, relationships between entities (people, organizations, etc.), and background context.
Return your response as a JSON object with this structure:
{{
  "storyline": "main storyline description",
  "relationships": [
    {{"entity1": "name1", "entity2": "name2", "relationship": "relationship description"}}
  ],
  "background": "background context and history"
}}
Focus on identifying key relationships like "Trump and Musk" or other important connections.`],
    ['human', `Article context:
Title: ${articleContext?.title || 'N/A'}
Content preview: ${articleContext?.content?.substring(0, 2000) || 'N/A'}

Selected text to analyze:
{text}

Please analyze the storyline, relationships, and background.`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ text });
  
  try {
    const contentStr = response.content as string;
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as StorylineResult;
    }
    // Fallback
    return {
      storyline: contentStr,
      relationships: [],
      background: ''
    };
  } catch (error) {
    return {
      storyline: response.content as string,
      relationships: [],
      background: ''
    };
  }
}

