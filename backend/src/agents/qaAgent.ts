import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createDeepSeekModel } from "./config.js";

const model = createDeepSeekModel({
  model: "deepseek-chat",
  temperature: 0.3,
});

export async function answerQuestion(
  question: string,
  articleContext: { title?: string; content?: string }
): Promise<string> {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a question-answering expert. Answer questions based on the provided article context. If the answer cannot be found in the article, say so clearly. Provide answers in Chinese.",
    ],
    [
      "human",
      `Article:
Title: {title}
Content: {content}

Question: {question}

Please answer the question based on the article.`,
    ],
  ]);

  const chain = prompt.pipe(model);
  const response = await chain.invoke({
    title: articleContext.title || "N/A",
    content: articleContext.content?.substring(0, 6000) || "N/A",
    question,
  });

  return response.content as string;
}

// 流式输出问答
export async function* answerQuestionStream(
  question: string,
  articleContext: { title?: string; content?: string }
): AsyncGenerator<string, void, unknown> {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are a question-answering expert. Answer questions based on the provided article context. If the answer cannot be found in the article, say so clearly. Provide answers in Chinese.",
    ],
    [
      "human",
      `Article:
Title: {title}
Content: {content}

Question: {question}

Please answer the question based on the article.`,
    ],
  ]);

  const chain = prompt.pipe(model);
  const stream = await chain.stream({
    title: articleContext.title || "N/A",
    content: articleContext.content?.substring(0, 6000) || "N/A",
    question,
  });

  for await (const chunk of stream) {
    if (chunk.content) {
      yield chunk.content as string;
    }
  }
}
