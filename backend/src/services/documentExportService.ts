import { ReadCastDocument } from '../agents/readcastAgent.js';
import fs from 'fs/promises';

export interface ExportMetadata {
  title: string;
  articleTitle?: string;
  difficulty: string;
  type: 'article' | 'favorites';
  generatedAt: Date;
  language?: string;
}

/**
 * 导出为JSON格式
 */
export async function exportToJSON(
  document: ReadCastDocument,
  metadata: ExportMetadata
): Promise<string> {
  const exportData = {
    metadata: {
      title: document.title || metadata.title,
      articleTitle: metadata.articleTitle,
      difficulty: metadata.difficulty,
      type: metadata.type,
      language: metadata.language || 'bilingual',
      generatedAt: metadata.generatedAt.toISOString(),
    },
    content: {
      summary: document.summary,
      knowledgePoints: document.knowledgePoints || [],
      difficulties: document.difficulties || [],
      terminology: document.terminology || [],
      customContent: document.customContent,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * 导出为Markdown格式
 */
export async function exportToMarkdown(
  document: ReadCastDocument,
  metadata: ExportMetadata
): Promise<string> {
  const lines: string[] = [];

  // 标题
  lines.push(`# ${document.title || metadata.title}\n`);

  // 元数据
  if (metadata.articleTitle) {
    lines.push(`**原文：** ${metadata.articleTitle}\n`);
  }
  lines.push(`**难度：** ${getDifficultyText(metadata.difficulty)}`);
  lines.push(`**生成时间：** ${metadata.generatedAt.toLocaleString('zh-CN')}\n`);
  lines.push('---\n');

  // 摘要
  lines.push('## 摘要\n');
  lines.push(document.summary || '暂无摘要');
  lines.push('\n---\n');

  // 知识点
  if (document.knowledgePoints && document.knowledgePoints.length > 0) {
    lines.push('## 知识点\n');
    document.knowledgePoints.forEach((kp, index) => {
      lines.push(`### ${index + 1}. ${kp.point}\n`);
      lines.push(`${kp.explanation}\n`);
    });
    lines.push('---\n');
  }

  // 难点解析
  if (document.difficulties && document.difficulties.length > 0) {
    lines.push('## 难点解析\n');
    document.difficulties.forEach((diff, index) => {
      lines.push(`### ${index + 1}. ${diff.difficulty}\n`);
      lines.push(`${diff.explanation}\n`);
      if (diff.examples && diff.examples.length > 0) {
        lines.push('**示例：**\n');
        diff.examples.forEach((example) => {
          lines.push(`- ${example}`);
        });
        lines.push('');
      }
    });
    lines.push('---\n');
  }

  // 术语表
  if (document.terminology && document.terminology.length > 0) {
    lines.push('## 术语表\n');
    document.terminology.forEach((term, index) => {
      lines.push(`### ${index + 1}. ${term.term}\n`);
      lines.push(`**定义：** ${term.definition}\n`);
      if (term.context) {
        lines.push(`**上下文：** ${term.context}\n`);
      }
    });
    lines.push('---\n');
  }

  // 补充内容
  if (document.customContent) {
    lines.push('## 补充内容\n');
    lines.push(document.customContent);
    lines.push('\n');
  }

  return lines.join('\n');
}

function getDifficultyText(difficulty: string): string {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return map[difficulty] || difficulty;
}

