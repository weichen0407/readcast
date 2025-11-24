import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createDeepSeekModel } from "./config.js";

const model = createDeepSeekModel({
  model: "deepseek-chat",
  temperature: 0.3,
});

export type DifficultyLevel = "low" | "medium" | "high";

export interface ReadCastDocument {
  title: string;
  summary: string;
  knowledgePoints: Array<{
    point: string;
    explanation: string;
  }>;
  difficulties: Array<{
    difficulty: string;
    explanation: string;
    examples?: string[];
  }>;
  terminology?: Array<{
    term: string;
    definition: string;
    context?: string;
  }>;
  customContent?: string;
}

/**
 * 生成文章的知识点和难点文档
 */
export type LanguageMode = "bilingual" | "english";

export async function generateArticleDocument(
  title: string,
  content: string,
  difficulty: DifficultyLevel,
  customRequirements?: string,
  articleType?: string,
  language: LanguageMode = "bilingual"
): Promise<ReadCastDocument> {
  // 根据难度调整prompt
  const difficultyInstructions = {
    low: "使用简单词汇和短句，提供基础知识点和简单的难点解释，适合初学者。",
    medium:
      "使用标准词汇和中等长度句子，提供核心知识点和适度的难点分析，适合中级学习者。",
    high: "使用高级词汇和复杂句式，提供深入的知识点和复杂的难点解析，适合高级学习者。",
  };

  // 根据文章类型调整提示
  let typeInstructions = "";
  if (articleType === "politics" || articleType === "news") {
    typeInstructions = "重点关注事件的前因后果、时间线、背景信息。";
  } else if (articleType === "sports") {
    typeInstructions = "重点关注专业术语、比赛规则、球员/队伍背景、技术分析。";
  } else if (articleType === "technology") {
    typeInstructions = "重点关注技术概念、应用场景、发展趋势。";
  }

  const customReqText = customRequirements
    ? `\n\n用户自定义要求：${customRequirements}`
    : "";

  // 根据语言模式调整指令
  const languageInstruction =
    language === "bilingual"
      ? `IMPORTANT: You are an English teacher helping students learn English and understand cultural context. Generate content in BILINGUAL format with PRIMARY FOCUS ON ENGLISH.

Guidelines:
- Use English as the MAIN language (80-90% English content)
- Chinese should only be used for BRIEF explanations, translations, or cultural context (10-20% Chinese)
- Format: "English content (中文简要解释)" or "English explanation - 中文补充说明"
- For knowledge points: Provide English explanation first, then brief Chinese translation or cultural note
- For difficulties: Explain in English with Chinese only for key terms or cultural context
- For terminology: English definition first, Chinese translation as supplementary
- Act as an English teacher: focus on teaching English vocabulary, grammar, and cultural understanding
- Keep Chinese minimal - only when it helps understand English or cultural context`
      : "IMPORTANT: Generate all content in ENGLISH ONLY. Do not use Chinese characters. All explanations, knowledge points, difficulties, and terminology should be in English.";

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert educational content creator. Your task is to create a comprehensive study document that focuses on knowledge points and difficulties from an article.

${difficultyInstructions[difficulty]}

${typeInstructions}

${languageInstruction}

Return your response as a JSON object with this structure:
{{
  "title": "文档标题",
  "summary": "文章摘要（2-3句话）",
  "knowledgePoints": [
    {{
      "point": "知识点1",
      "explanation": "详细解释"
    }}
  ],
  "difficulties": [
    {{
      "difficulty": "难点1",
      "explanation": "详细解析",
      "examples": ["例句1", "例句2"]
    }}
  ],
  "terminology": [
    {{
      "term": "术语1",
      "definition": "定义",
      "context": "上下文"
    }}
  ],
  "customContent": "根据用户要求添加的额外内容（如果有）"
}}

Important: Focus on extracting KNOWLEDGE POINTS (what the reader should learn) and DIFFICULTIES (challenging concepts that need explanation).`,
    ],
    [
      "human",
      `Article Title: {title}

Article Content:
{content}

${customReqText}

Please create a comprehensive study document focusing on knowledge points and difficulties.`,
    ],
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({
    title,
    content: content.substring(0, 8000), // 限制内容长度
  });

  try {
    const contentStr = response.content as string;
    // 尝试提取JSON
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ReadCastDocument;
      return parsed;
    }
    // 如果JSON解析失败，返回结构化文本
    return {
      title: `${title} - 学习文档`,
      summary: contentStr.substring(0, 200),
      knowledgePoints: [],
      difficulties: [],
      customContent: contentStr,
    };
  } catch (error) {
    // 如果解析失败，返回基础结构
    return {
      title: `${title} - 学习文档`,
      summary: response.content as string,
      knowledgePoints: [],
      difficulties: [],
      customContent: response.content as string,
    };
  }
}

/**
 * 生成收藏内容的复习文档
 */
export async function generateFavoritesDocument(
  favoriteSentences: Array<{
    sentence: string;
    originalSentence?: string;
    explanation?: string;
    tags?: string;
    articleTitle?: string;
  }>,
  difficulty: DifficultyLevel,
  customRequirements?: string,
  generateType: "today" | "selected" = "selected",
  language: LanguageMode = "bilingual"
): Promise<ReadCastDocument> {
  const difficultyInstructions = {
    low: "使用简单词汇和短句，提供基础知识点和简单的难点解释。",
    medium: "使用标准词汇和中等长度句子，提供核心知识点和适度的难点分析。",
    high: "使用高级词汇和复杂句式，提供深入的知识点和复杂的难点解析。",
  };

  const typeText =
    generateType === "today" ? "今日收藏的所有内容" : "用户选择的收藏内容";

  // 构建收藏内容文本
  const favoritesText = favoriteSentences
    .map((fav, idx) => {
      let text = `${idx + 1}. ${fav.originalSentence || fav.sentence}`;
      if (fav.explanation) {
        text += `\n   解释：${fav.explanation}`;
      }
      if (fav.articleTitle) {
        text += `\n   来源：${fav.articleTitle}`;
      }
      return text;
    })
    .join("\n\n");

  const customReqText = customRequirements
    ? `\n\n用户自定义要求：${customRequirements}`
    : "";

  // 根据语言模式调整指令
  const languageInstruction =
    language === "bilingual"
      ? `IMPORTANT: You are an English teacher helping students learn English and understand cultural context. Generate content in BILINGUAL format with PRIMARY FOCUS ON ENGLISH.

Guidelines:
- Use English as the MAIN language (80-90% English content)
- Chinese should only be used for BRIEF explanations, translations, or cultural context (10-20% Chinese)
- Format: "English content (中文简要解释)" or "English explanation - 中文补充说明"
- For knowledge points: Provide English explanation first, then brief Chinese translation or cultural note
- For difficulties: Explain in English with Chinese only for key terms or cultural context
- For terminology: English definition first, Chinese translation as supplementary
- Act as an English teacher: focus on teaching English vocabulary, grammar, and cultural understanding
- Keep Chinese minimal - only when it helps understand English or cultural context`
      : "IMPORTANT: Generate all content in ENGLISH ONLY. Do not use Chinese characters. All explanations, knowledge points, difficulties, and terminology should be in English.";

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert educational content creator. Your task is to create a comprehensive review document based on saved favorite sentences.

${difficultyInstructions[difficulty]}

${languageInstruction}

Return your response as a JSON object with this structure:
{{
  "title": "复习文档标题",
  "summary": "内容总结（2-3句话）",
  "knowledgePoints": [
    {{
      "point": "知识点1",
      "explanation": "详细解释"
    }}
  ],
  "difficulties": [
    {{
      "difficulty": "难点1",
      "explanation": "详细解析",
      "examples": ["例句1", "例句2"]
    }}
  ],
  "terminology": [
    {{
      "term": "术语1",
      "definition": "定义",
      "context": "上下文"
    }}
  ],
  "customContent": "根据用户要求添加的额外内容（如果有）"
}}

Focus on organizing the favorite sentences into meaningful knowledge points and identifying difficulties that need explanation.`,
    ],
    [
      "human",
      `Based on ${typeText}, create a review document:

Favorite Sentences:
${favoritesText}

${customReqText}

Please create a comprehensive review document that organizes these sentences into knowledge points and difficulties.`,
    ],
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({
    favoritesText,
    customReqText: customReqText || "",
  });

  try {
    const contentStr = response.content as string;
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as ReadCastDocument;
      return parsed;
    }
    return {
      title: "收藏内容复习文档",
      summary: contentStr.substring(0, 200),
      knowledgePoints: [],
      difficulties: [],
      customContent: contentStr,
    };
  } catch (error) {
    return {
      title: "收藏内容复习文档",
      summary: response.content as string,
      knowledgePoints: [],
      difficulties: [],
      customContent: response.content as string,
    };
  }
}
