import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.2,
});

export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'event' | 'other';
  description?: string;
}

export interface EntityResult {
  entities: Entity[];
}

export async function extractEntities(
  text: string
): Promise<EntityResult> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an entity extraction expert. Extract all important entities (people, organizations, locations, events) from the text.
Return your response as a JSON object with this structure:
{{
  "entities": [
    {{"name": "entity name", "type": "person" | "organization" | "location" | "event" | "other", "description": "brief description"}}
  ]
}}`],
    ['human', `Text to analyze:
{text}

Please extract all important entities.`]
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({ text });
  
  try {
    const contentStr = response.content as string;
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as EntityResult;
    }
    // Fallback
    return { entities: [] };
  } catch (error) {
    return { entities: [] };
  }
}

