import { ChatPromptTemplate } from '@langchain/core/prompts';
import { createDeepSeekModel } from './config.js';
import { ReadCastDocument } from './readcastAgent.js';

export type PodcastMode = 'solo' | 'dialogue';

export interface PodcastScript {
  mode: PodcastMode;
  segments: Array<{
    speaker?: string;
    content: string;
    language?: 'zh' | 'en';
  }>;
  intro?: string;
  outro?: string;
}

const model = createDeepSeekModel({
  model: 'deepseek-chat',
  temperature: 0.5, // 稍高的温度使脚本更自然
});

/**
 * 生成播客脚本
 */
export type LanguageMode = 'bilingual' | 'english';

export async function generatePodcastScript(
  document: ReadCastDocument,
  mode: PodcastMode,
  language: LanguageMode = 'bilingual'
): Promise<PodcastScript> {
  const modeInstructions = {
    solo: `生成单人播客脚本。你是一位英语老师，通过播客形式讲解文章中的重点单词、搭配、习语和地道表达。使用第一人称，语言自然流畅，适合播客朗读。`,
    dialogue: `生成对话播客脚本。创建两个角色：一位英语老师（Teacher）和一位学生（Student）。老师负责讲解文章中的重点单词、搭配、习语和地道表达，学生可以提问或回应。通过对话形式呈现内容，每个对话段落需要标注说话人。`
  };

  const languageInstructions = language === 'bilingual'
    ? `IMPORTANT: You are an English teacher creating a podcast script. Generate script in BILINGUAL format with PRIMARY FOCUS ON ENGLISH (80-90% English, 10-20% Chinese for brief explanations).

Guidelines:
- Focus on teaching English vocabulary, collocations, idioms, and authentic expressions from the article
- Explain word meanings, usage, collocations (word combinations), idioms, and cultural context
- Use English as the main language, Chinese only for brief clarifications or cultural notes
- Format: "English explanation (中文简要说明)" or "English content - 中文补充"
- Mark language for each segment (use 'zh' for Chinese segments, 'en' for English segments)
- Act as an English teacher: explain WHY words are used this way, not just translate`
    : `IMPORTANT: You are an English teacher creating a podcast script. Generate script in ENGLISH ONLY. Focus on teaching English vocabulary, collocations, idioms, and authentic expressions. Do not use Chinese characters. Mark language as 'en' for all segments.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an English teacher creating an educational podcast script. Your task is to create a podcast script that TEACHES English vocabulary, collocations, idioms, and authentic expressions from a study document.

IMPORTANT: This is NOT a translation podcast. You are teaching English as a language teacher would:
- Explain key vocabulary: word meanings, usage, pronunciation tips
- Teach collocations: common word combinations (e.g., "make a decision", not "do a decision")
- Explain idioms and phrases: their origins, meanings, and when to use them
- Share authentic expressions: how native speakers actually say things
- Provide context: when and why to use certain words/phrases
- Give examples: real-world usage examples

${modeInstructions[mode]}

${languageInstructions}

The script should:
- Be engaging and educational, like a real English lesson
- Focus on teaching language points, not just reading/translating the article
- Include an introduction and conclusion
- Break content into digestible segments focusing on different language points
- For dialogue mode: Teacher explains, Student asks questions or responds
- Follow the language mode specified above

Return your response as a JSON object with this structure:
{{
  "mode": "${mode}",
  "intro": "开场白（1-2句话）",
  "segments": [
    {{
      "speaker": "说话人（仅对话模式需要）",
      "content": "内容",
      "language": "zh或en（可选，默认zh）"
    }}
  ],
  "outro": "结尾总结（1-2句话）"
}}`],
    ['human', `Document Title: {title}

Summary: {summary}

Knowledge Points:
{knowledgePoints}

Difficulties:
{difficulties}

Terminology: {terminology}

Please create a ${mode} podcast script based on this document.`]
  ]);

  const chain = prompt.pipe(model);
  
  // 格式化文档内容
  const knowledgePointsText = document.knowledgePoints.map((kp, idx) => 
    `${idx + 1}. ${kp.point}: ${kp.explanation}`
  ).join('\n');

  const difficultiesText = document.difficulties.map((diff, idx) => 
    `${idx + 1}. ${diff.difficulty}: ${diff.explanation}${diff.examples ? '\n   示例: ' + diff.examples.join(', ') : ''}`
  ).join('\n');

  const terminologyText = document.terminology && document.terminology.length > 0
    ? document.terminology.map(t => `${t.term}: ${t.definition}`).join('\n')
    : '无';

  const response = await chain.invoke({
    title: document.title,
    summary: document.summary,
    knowledgePoints: knowledgePointsText.substring(0, 3000),
    difficulties: difficultiesText.substring(0, 3000),
    terminology: terminologyText.substring(0, 1000)
  });

  try {
    const contentStr = response.content as string;
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as PodcastScript;
      parsed.mode = mode;
      return parsed;
    }
    // 如果JSON解析失败，返回基础结构
    return {
      mode,
      intro: '欢迎收听本期学习播客。',
      segments: [
        {
          content: document.summary || '今天我们来学习这篇文档的内容。',
          language: 'zh'
        }
      ],
      outro: '感谢收听，我们下期再见。'
    };
  } catch (error) {
    console.error('Error parsing podcast script:', error);
    return {
      mode,
      intro: '欢迎收听本期学习播客。',
      segments: [
        {
          content: document.summary || '今天我们来学习这篇文档的内容。',
          language: 'zh'
        }
      ],
      outro: '感谢收听，我们下期再见。'
    };
  }
}

