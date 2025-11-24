import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { createAgent, tool } from "langchain";
import { z } from "zod";
import { createDeepSeekModel } from "./config.js";
import { extractKeywords } from "./keywordAgent.js";
import { summarizeArticle } from "./summaryAgent.js";
import { analyzeStoryline } from "./storylineAgent.js";
import { getArticleById } from "../services/articleService.js";

// 展示 LangChain 1.0 的 Chain 功能
export async function processArticleWithChain(
  title: string,
  content: string
): Promise<{
  keywords: any;
  summary: string;
  storyline: any;
}> {
  // 创建 Chain：关键词提取 -> 总结 -> 故事线分析
  // 使用 RunnableSequence 需要至少2个步骤，这里直接调用函数
  const keywordChain = async () => {
    return await extractKeywords(title, content);
  };

  const summaryChain = async () => {
    return await summarizeArticle(title, content);
  };

  const storylineChain = async () => {
    const selectedText = content.substring(0, 1000);
    return await analyzeStoryline(selectedText, { title, content });
  };

  // 并行执行多个chains
  const [keywords, summary, storyline] = await Promise.all([
    keywordChain(),
    summaryChain(),
    storylineChain(),
  ]);

  return {
    keywords,
    summary,
    storyline,
  };
}

// 使用 LangChain 1.0 的 tool 函数创建工具
export const articleRetrievalTool = tool(
  async ({ articleId }: { articleId: number }) => {
    try {
      const article = getArticleById(articleId);
      return `Article Title: ${
        article.title || "Untitled"
      }\nContent: ${article.content.substring(0, 500)}...`;
    } catch (error) {
      return `Article ${articleId} not found`;
    }
  },
  {
    name: "article_retrieval",
    description: "Retrieve article content by ID from the database",
    schema: z.object({
      articleId: z.number().describe("The ID of the article to retrieve"),
    }),
  }
);

export const keywordLookupTool = tool(
  async ({ articleId }: { articleId: number }) => {
    try {
      const { getDatabase } = await import("../db/database.js");
      const db = getDatabase();
      const stmt = db.prepare(
        "SELECT keywords FROM article_keywords WHERE articleId = ?"
      );
      const row = stmt.get(articleId) as { keywords: string } | undefined;
      if (row) {
        const keywords = JSON.parse(row.keywords);
        return JSON.stringify(keywords);
      }
      return "No keywords found for this article";
    } catch (error) {
      return "Failed to retrieve keywords";
    }
  },
  {
    name: "keyword_lookup",
    description: "Look up keywords for an article from the database",
    schema: z.object({
      articleId: z
        .number()
        .describe("The ID of the article to look up keywords for"),
    }),
  }
);

// 展示 Memory 功能 - 使用简单的内存存储
const conversationMemory = new Map<string, any[]>();

export function createMemory(sessionId: string) {
  if (!conversationMemory.has(sessionId)) {
    conversationMemory.set(sessionId, []);
  }
  return {
    getHistory: () => conversationMemory.get(sessionId) || [],
    addMessage: (message: any) => {
      const history = conversationMemory.get(sessionId) || [];
      history.push(message);
      conversationMemory.set(sessionId, history);
    },
    clear: () => conversationMemory.set(sessionId, []),
  };
}

// 使用 LangChain 1.0 的 createAgent API 创建真正的 Agent
export async function executeAgentWorkflow(
  task: string,
  articleContext: { title?: string; content?: string; articleId?: number }
): Promise<string> {
  const model = createDeepSeekModel({
    model: "deepseek-chat",
    temperature: 0.3,
  });

  // 创建 Agent，使用 LangChain 1.0 的新 API
  const agent = createAgent({
    model: model, // 使用 model 参数（LangChain 1.0 标准）
    tools: [articleRetrievalTool, keywordLookupTool],
    systemPrompt: `You are an intelligent article analysis assistant. You can:
- Retrieve article content using the article_retrieval tool
- Look up keywords using the keyword_lookup tool
- Analyze and summarize articles based on the context provided

When given a task, use the appropriate tools to gather information, then provide a comprehensive analysis in Chinese.`,
  });

  // 构建消息
  const contextInfo = articleContext.articleId
    ? `Article ID: ${articleContext.articleId}. Use the tools to retrieve information.`
    : `Article Title: ${articleContext.title || "N/A"}\nContent preview: ${
        articleContext.content?.substring(0, 500) || "N/A"
      }...`;

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: `Task: ${task}\n\nContext:\n${contextInfo}\n\nPlease complete this task.`,
      },
    ],
  });

  // 提取最终回复
  const lastMessage = result.messages[result.messages.length - 1];
  return (lastMessage.content as string) || "Task completed";
}
