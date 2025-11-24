import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createDeepSeekModel } from "./config.js";

const model = createDeepSeekModel({
  model: "deepseek-chat",
  temperature: 0.2,
});

export interface CleanedArticle {
  title: string;
  content: string;
  removedElements: string[];
}

/**
 * 使用AI清理文章内容，去除图片地址、广告、无关信息等
 * 重要：保留段落结构
 */
export async function cleanArticleContent(
  rawContent: string,
  title?: string
): Promise<CleanedArticle> {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an article content cleaner expert. Your task is to clean and extract the main article content from raw HTML or text, removing:
1. Image URLs and image references
2. Advertisement content
3. Navigation menus and headers
4. Footer information
5. Social media sharing buttons
6. Comments sections
7. Related article links
8. Any other non-essential content

Keep only:
- The main article title
- The main article body text
- Important paragraphs and sentences

IMPORTANT: Preserve paragraph structure! Use double newlines (\\n\\n) to separate paragraphs. Each paragraph should be on its own line or separated by blank lines. Do NOT merge all text into a single paragraph.

Return your response as a JSON object with this structure:
{{
  "title": "cleaned title",
  "content": "cleaned article content (pure text, no HTML tags, no URLs, but MUST preserve paragraph breaks)",
  "removedElements": ["list of removed elements"]
}}

The content should be clean, readable text without any HTML tags, URLs, but MUST preserve paragraph breaks.`,
    ],
    [
      "human",
      `Title: {title}

Raw Content:
{content}

Please clean this article content and extract only the essential text, preserving paragraph structure.`,
    ],
  ]);

  try {
    const chain = prompt.pipe(model);
    const response = await chain.invoke({
      title: title || "Untitled Article",
      content: rawContent.substring(0, 8000), // Limit content length
    });

    try {
      const contentStr = response.content as string;
      if (!contentStr || contentStr.trim().length === 0) {
        throw new Error('AI returned empty response');
      }

      // Try to extract JSON from response
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as CleanedArticle;
          // Validate parsed result
          if (!parsed.content || parsed.content.trim().length < 10) {
            throw new Error('Parsed content is too short');
          }
          // Ensure paragraphs are preserved
          parsed.content = parsed.content
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]+/g, ' ')
            .trim();
          return parsed;
        } catch (parseError) {
          console.warn('JSON parse error, using fallback:', parseError);
        }
      }

      // Fallback: return cleaned content without JSON structure
      // Ensure paragraphs are preserved (double newlines)
      let cleanedContent = contentStr.trim();
      
      // If AI didn't preserve paragraphs well, try to fix it
      // Look for sentence endings followed by capital letters (likely new paragraph)
      cleanedContent = cleanedContent
        .replace(/([.!?])\s+([A-Z][a-z])/g, '$1\n\n$2') // Add paragraph breaks after sentences
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
        .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs, but keep newlines
        .trim();
      
      if (cleanedContent.length < 10) {
        throw new Error('Cleaned content is too short');
      }

      return {
        title: title || "Untitled Article",
        content: cleanedContent,
        removedElements: [],
      };
    } catch (error) {
      console.error('Error processing AI response:', error);
      // If parsing fails, return a cleaned version of raw content (preserve paragraphs)
      const basicCleaned = rawContent
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
        .replace(/\[.*?\]/g, '') // Remove brackets
        .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
        .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs, but keep newlines
        .trim()
        .substring(0, 10000);

      return {
        title: title || "Untitled Article",
        content: basicCleaned || rawContent.substring(0, 10000),
        removedElements: ['AI processing failed, using basic cleanup'],
      };
    }
  } catch (error) {
    console.error('AI clean error:', error);
    // If AI call fails completely, return basic cleaned content (preserve paragraphs)
    const basicCleaned = rawContent
      .replace(/<[^>]*>/g, '')
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs, but keep newlines
      .trim()
      .substring(0, 10000);

    return {
      title: title || "Untitled Article",
      content: basicCleaned || rawContent.substring(0, 10000),
      removedElements: ['AI service unavailable, using basic cleanup'],
    };
  }
}

