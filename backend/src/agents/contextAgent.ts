import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createDeepSeekModel } from "./config.js";

const model = createDeepSeekModel({
  model: "deepseek-chat",
  temperature: 0.4,
});

export async function understandContext(
  text: string,
  keywords: string[],
  fullArticle?: string
): Promise<string> {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a context understanding expert. Analyze the given text in the context of the full article and key keywords.
Provide a comprehensive explanation in Chinese that:
1. Explains the meaning of the selected text
2. Shows how it relates to the key themes (keywords)
3. Provides context from the full article
4. Explains why this text is important`,
    ],
    [
      "human",
      `Key Keywords: {keywords}

Full Article Context:
{fullArticle}

Selected Text:
{text}

Please provide a comprehensive context understanding.`,
    ],
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({
    keywords: keywords.join(", "),
    fullArticle: fullArticle?.substring(0, 4000) || "N/A",
    text,
  });

  return response.content as string;
}
