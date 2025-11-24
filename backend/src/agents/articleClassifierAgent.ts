import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createDeepSeekModel } from "./config.js";

const model = createDeepSeekModel({
  model: "deepseek-chat",
  temperature: 0.3,
});

export type ArticleCategory = 'sports' | 'politics' | 'technology' | 'business' | 'science' | 'entertainment' | 'general' | null;

export async function classifyArticleType(
  title: string,
  content: string
): Promise<ArticleCategory> {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an article classifier. Classify the article into one of these categories:
- sports: Sports news, NBA, football, soccer, Olympics, etc.
- politics: Political news, elections, government, policy, etc.
- technology: Tech news, AI, software, hardware, startups, etc.
- business: Business news, finance, economy, markets, etc.
- science: Science news, research, discoveries, health, medicine, etc.
- entertainment: Entertainment news, movies, music, celebrities, etc.
- general: General news that doesn't fit other categories

Return only the category name (e.g., "sports", "politics", "technology", etc.) or "general" if unsure.`,
    ],
    [
      "human",
      `Title: {title}
Content preview: {content}

Classify this article into one category.`,
    ],
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({
    title,
    content: content.substring(0, 2000), // Limit content length
  });

  const category = (response.content as string).toLowerCase().trim();
  
  // 提取类别
  const validCategories: ArticleCategory[] = [
    'sports',
    'politics',
    'technology',
    'business',
    'science',
    'entertainment',
    'general',
  ];

  for (const validCategory of validCategories) {
    if (category.includes(validCategory)) {
      return validCategory;
    }
  }

  return 'general';
}

