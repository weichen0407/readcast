import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ReadCastDocument } from "../agents/readcastAgent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 尝试找到中文字体文件路径
let chineseFontPath: string | null = null;
let chineseFontBoldPath: string | null = null;

try {
  // 字体路径（优先使用项目内的字体文件）
  // __dirname 在 ES module 中指向 backend/src/services
  const possibleFontsDirs = [
    path.resolve(__dirname, "../../fonts"), // backend/src/services -> backend/fonts
    path.resolve(__dirname, "../fonts"), // 备选路径
    path.join(process.cwd(), "backend/fonts"), // 从项目根目录
    path.join(process.cwd(), "fonts"), // 如果从 backend 目录运行
  ];

  let fontsDir: string | null = null;
  for (const dir of possibleFontsDirs) {
    if (fs.existsSync(dir)) {
      fontsDir = dir;
      console.log("Fonts directory found:", fontsDir);
      break;
    }
  }

  if (!fontsDir) {
    console.warn("Fonts directory not found. Tried:", possibleFontsDirs);
  }

  const regularFontPaths = fontsDir
    ? [
        path.resolve(fontsDir, "NotoSerifCJKsc-Regular.otf"), // 已有的 Noto Serif 字体（优先）
        path.resolve(fontsDir, "SourceHanSans-Regular.otf"), // 思源黑体（如果下载了）
        path.resolve(fontsDir, "NotoSansCJK-Regular.ttf"), // Noto Sans（如果下载了）
        path.resolve(fontsDir, "NotoSansCJKsc-Regular.ttf"), // Noto Sans 变体
      ]
    : [];

  // 添加系统字体路径（只添加 .ttf 和 .otf，不添加 .ttc）
  regularFontPaths.push(
    "/Library/Fonts/Microsoft/SimHei.ttf" // Windows 字体（如果安装了）
  );

  const boldFontPaths = fontsDir
    ? [
        path.resolve(fontsDir, "SourceHanSans-Bold.otf"), // 思源黑体粗体（如果下载了）
        path.resolve(fontsDir, "NotoSansCJK-Bold.ttf"), // Noto Sans 粗体（如果下载了）
        path.resolve(fontsDir, "NotoSerifCJKsc-Regular.otf"), // 如果没有粗体，使用已有的常规字体
        path.resolve(fontsDir, "SourceHanSans-Regular.otf"), // 如果没有粗体，使用常规字体
      ]
    : [];

  // 添加系统粗体字体路径（只添加 .ttf 和 .otf）
  // boldFontPaths 已经包含了项目字体，这里不需要添加系统字体

  // 查找常规字体
  for (const fontPath of regularFontPaths) {
    try {
      // fontPath 已经是绝对路径了
      if (fs.existsSync(fontPath)) {
        chineseFontPath = fontPath;
        console.log("Chinese regular font found:", fontPath);
        console.log("Font file size:", fs.statSync(fontPath).size, "bytes");
        break;
      }
    } catch (err) {
      // 继续尝试下一个字体
      continue;
    }
  }

  // 查找粗体字体
  for (const fontPath of boldFontPaths) {
    try {
      // fontPath 已经是绝对路径了
      if (fs.existsSync(fontPath)) {
        chineseFontBoldPath = fontPath;
        console.log("Chinese bold font found:", fontPath);
        break;
      }
    } catch (err) {
      // 继续尝试下一个字体
      continue;
    }
  }

  // 如果没有找到粗体字体，使用常规字体作为粗体
  if (!chineseFontBoldPath && chineseFontPath) {
    chineseFontBoldPath = chineseFontPath;
  }

  if (!chineseFontPath) {
    console.warn(
      "No Chinese font found, PDF may display Chinese characters incorrectly"
    );
  }
} catch (err) {
  console.warn("Failed to find Chinese font:", err);
}

export interface PDFMetadata {
  title: string;
  articleTitle?: string;
  difficulty: string;
  type: "article" | "favorites";
  generatedAt: Date;
}

/**
 * 生成PDF文档
 */
export function generatePDF(
  document: ReadCastDocument,
  metadata: PDFMetadata
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 40,
        },
      });

      // 注册中文字体（如果可用）
      // chineseFontPath 已经是绝对路径了
      if (chineseFontPath) {
        try {
          console.log("=== PDF Font Registration ===");
          console.log("Registering Chinese font:", chineseFontPath);
          console.log("Font file exists:", fs.existsSync(chineseFontPath));
          console.log(
            "Font file size:",
            fs.statSync(chineseFontPath).size,
            "bytes"
          );

          // 对于 .otf 和 .ttf 文件，直接使用路径
          // .ttc 文件不支持，已在字体路径列表中移除
          if (chineseFontPath.endsWith(".ttc")) {
            console.error("Error: .ttc files are not supported by pdfkit");
            throw new Error(
              ".ttc font files are not supported. Please use .otf or .ttf files."
            );
          }

          doc.registerFont("Chinese", chineseFontPath);
          console.log('✓ Chinese font registered as "Chinese"');

          if (chineseFontBoldPath && chineseFontBoldPath !== chineseFontPath) {
            if (chineseFontBoldPath.endsWith(".ttc")) {
              console.error("Error: Bold font is .ttc, not supported");
              throw new Error(
                ".ttc font files are not supported. Please use .otf or .ttf files."
              );
            }
            console.log("Registering Chinese bold font:", chineseFontBoldPath);
            doc.registerFont("ChineseBold", chineseFontBoldPath);
            console.log('✓ Chinese bold font registered as "ChineseBold"');
          } else {
            console.log("Using regular font as bold font");
            doc.registerFont("ChineseBold", chineseFontPath);
            console.log('✓ Chinese font also registered as "ChineseBold"');
          }

          console.log("=== Chinese fonts registered successfully ===");
        } catch (err) {
          console.error("✗ Failed to register Chinese font:", err);
          console.error(
            "Error details:",
            err instanceof Error ? err.stack : err
          );
          // 如果注册失败，继续使用默认字体
          chineseFontPath = null;
        }
      } else {
        console.warn("⚠ No Chinese font path available, using default fonts");
      }

      // 选择字体函数：如果有中文字体则使用，否则使用默认字体
      const getFont = (bold: boolean = false) => {
        if (chineseFontPath) {
          const fontName = bold ? "ChineseBold" : "Chinese";
          return fontName;
        }
        return bold ? "Helvetica-Bold" : "Helvetica";
      };

      // 确保字体已注册的验证
      if (chineseFontPath) {
        console.log(
          "Chinese font will be used for all text. Font path:",
          chineseFontPath
        );
      } else {
        console.warn(
          "WARNING: No Chinese font available, PDF may show garbled Chinese text!"
        );
      }

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => {
        buffers.push(chunk);
      });
      doc.on("end", () => {
        try {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        } catch (err) {
          reject(err);
        }
      });
      doc.on("error", (err: Error) => {
        console.error("PDF generation error:", err);
        reject(err);
      });

      // 封面页（紧凑版）
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points

      doc
        .fontSize(20)
        .font(getFont(true))
        .text(document.title || metadata.title, 40, 60, {
          align: "center",
          width: pageWidth - 80,
        });

      let yPos = 100;
      if (metadata.articleTitle) {
        doc
          .fontSize(11)
          .font(getFont())
          .text(`原文：${metadata.articleTitle}`, 40, yPos, {
            align: "center",
            width: pageWidth - 80,
          });
        yPos += 20;
      }

      doc
        .fontSize(10)
        .font(getFont())
        .text(`难度：${getDifficultyText(metadata.difficulty)}`, 40, yPos, {
          align: "center",
          width: pageWidth - 80,
        });
      yPos += 15;

      doc
        .fontSize(9)
        .font(getFont())
        .text(
          `生成时间：${metadata.generatedAt.toLocaleString("zh-CN")}`,
          40,
          yPos,
          {
            align: "center",
            width: pageWidth - 80,
          }
        );

      // 添加新页面
      doc.addPage();

      // 目录（紧凑版）
      doc.fontSize(16).font(getFont(true)).text("目录", 40, 40);

      let tocY = 60;
      // 计算目录项页码（从第3页开始，因为封面是第1页，目录是第2页）
      let currentPage = 3;
      const tocItems = [{ title: "摘要", page: currentPage++ }];

      if (document.knowledgePoints && document.knowledgePoints.length > 0) {
        tocItems.push({ title: "知识点", page: currentPage++ });
      }
      if (document.difficulties && document.difficulties.length > 0) {
        tocItems.push({ title: "难点解析", page: currentPage++ });
      }
      if (document.terminology && document.terminology.length > 0) {
        tocItems.push({ title: "术语表", page: currentPage++ });
      }
      if (document.customContent) {
        tocItems.push({ title: "补充内容", page: currentPage++ });
      }

      tocItems.forEach((item, index) => {
        doc
          .fontSize(10)
          .font(getFont())
          .text(`${index + 1}. ${item.title}`, 50, tocY);
        tocY += 15;
      });

      // 摘要页（紧凑版）
      doc.addPage();
      doc.fontSize(16).font(getFont(true)).text("摘要", 40, 40);

      doc
        .fontSize(10)
        .font(getFont())
        .text(document.summary || "暂无摘要", 40, 60, {
          align: "left",
          width: pageWidth - 80,
          lineGap: 3,
        });

      // 知识点页（紧凑版）
      if (document.knowledgePoints && document.knowledgePoints.length > 0) {
        doc.addPage();
        doc.fontSize(16).font(getFont(true)).text("知识点", 40, 40);

        let yPos = 60;
        document.knowledgePoints.forEach((kp, index) => {
          // 检查是否需要新页面
          if (yPos > pageHeight - 80) {
            doc.addPage();
            yPos = 40;
          }

          doc
            .fontSize(11)
            .font(getFont(true))
            .text(`${index + 1}. ${kp.point}`, 40, yPos);

          yPos += 15;

          doc
            .fontSize(9)
            .font(getFont())
            .text(kp.explanation, 50, yPos, {
              width: pageWidth - 100,
              lineGap: 2,
            });

          const explanationHeight = doc.heightOfString(kp.explanation, {
            width: pageWidth - 100,
          });
          yPos += explanationHeight + 10;
        });
      }

      // 难点解析页（紧凑版）
      if (document.difficulties && document.difficulties.length > 0) {
        doc.addPage();
        doc.fontSize(16).font(getFont(true)).text("难点解析", 40, 40);

        let yPos = 60;
        document.difficulties.forEach((diff, index) => {
          if (yPos > pageHeight - 80) {
            doc.addPage();
            yPos = 40;
          }

          doc
            .fontSize(11)
            .font(getFont(true))
            .text(`${index + 1}. ${diff.difficulty}`, 40, yPos);

          yPos += 15;

          doc
            .fontSize(9)
            .font(getFont())
            .text(diff.explanation, 50, yPos, {
              width: pageWidth - 100,
              lineGap: 2,
            });

          const explanationHeight = doc.heightOfString(diff.explanation, {
            width: pageWidth - 100,
          });
          yPos += explanationHeight + 8;

          if (diff.examples && diff.examples.length > 0) {
            doc.fontSize(8).font(getFont()).text("示例：", 50, yPos);
            yPos += 12;

            diff.examples.forEach((example) => {
              doc
                .fontSize(8)
                .font(getFont())
                .text(`• ${example}`, 60, yPos, {
                  width: pageWidth - 120,
                  lineGap: 1,
                });
              const exampleHeight = doc.heightOfString(example, {
                width: pageWidth - 120,
              });
              yPos += exampleHeight + 6;
            });
          }

          yPos += 8;
        });
      }

      // 术语表（紧凑版）
      if (document.terminology && document.terminology.length > 0) {
        doc.addPage();
        doc.fontSize(16).font(getFont(true)).text("术语表", 40, 40);

        let yPos = 60;
        document.terminology.forEach((term, index) => {
          if (yPos > pageHeight - 80) {
            doc.addPage();
            yPos = 40;
          }

          doc
            .fontSize(11)
            .font(getFont(true))
            .text(`${index + 1}. ${term.term}`, 40, yPos);

          yPos += 15;

          doc
            .fontSize(9)
            .font(getFont())
            .text(`定义：${term.definition}`, 50, yPos, {
              width: pageWidth - 100,
              lineGap: 2,
            });

          const definitionHeight = doc.heightOfString(term.definition, {
            width: pageWidth - 100,
          });
          yPos += definitionHeight + 8;

          if (term.context) {
            doc
              .fontSize(8)
              .font(getFont())
              .text(`上下文：${term.context}`, 50, yPos, {
                width: pageWidth - 100,
                lineGap: 1,
              });
            const contextHeight = doc.heightOfString(term.context, {
              width: pageWidth - 100,
            });
            yPos += contextHeight + 10;
          }

          yPos += 8;
        });
      }

      // 补充内容（紧凑版）
      if (document.customContent) {
        doc.addPage();
        doc.fontSize(16).font(getFont(true)).text("补充内容", 40, 40);

        doc
          .fontSize(9)
          .font(getFont())
          .text(document.customContent, 40, 60, {
            width: pageWidth - 80,
            lineGap: 2,
          });
      }

      // 添加页脚（在所有页面上）
      // 注意：需要在所有内容添加完成后才能获取正确的页数
      // 先结束文档生成，然后在回调中处理页脚
      doc.end();

      // 页脚会在文档生成完成后自动添加（如果需要的话）
    } catch (error) {
      reject(error);
    }
  });
}

function getDifficultyText(difficulty: string): string {
  const map: Record<string, string> = {
    low: "低",
    medium: "中",
    high: "高",
  };
  return map[difficulty] || difficulty;
}
