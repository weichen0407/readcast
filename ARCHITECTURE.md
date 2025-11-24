# 系统架构说明

## 文章导入流程

### 当前架构

#### 1. **获取文章内容** (服务函数，非Agent)
- **文件**: `backend/src/services/articleParser.ts`
- **函数**: `parseArticleFromUrl(url: string)`
- **作用**: 
  - 使用 `axios` 获取网页HTML
  - 使用 `cheerio` 解析HTML，提取文章内容
  - 移除脚本、样式、导航等非内容元素
  - 返回原始文章内容（可能包含HTML标签、图片链接等）

#### 2. **AI清理文章** (Agent)
- **文件**: `backend/src/agents/articleCleanerAgent.ts`
- **函数**: `cleanArticleContent(rawContent: string, title?: string)`
- **作用**:
  - 使用 DeepSeek AI 分析文章内容
  - 智能识别并移除：
    - 图片URL和图片引用
    - 广告内容
    - 导航菜单和页眉
    - 页脚信息
    - 社交媒体分享按钮
    - 评论区域
    - 相关文章链接
    - 其他非必要内容
  - 返回清理后的纯文本内容

### 完整流程

```
用户输入URL
    ↓
parseArticleFromUrl (服务函数)
    ↓ 获取原始HTML内容
cleanArticleContent (AI Agent)
    ↓ AI智能清理
清理后的纯文本
    ↓
保存到数据库
```

### 为什么这样设计？

1. **parseArticleFromUrl** 是服务函数：
   - 使用规则和选择器提取内容
   - 不需要AI，速度快
   - 处理HTML结构

2. **cleanArticleContent** 是Agent：
   - 需要AI理解内容语义
   - 智能识别什么是"无关内容"
   - 处理复杂情况（如CNN这种有很多广告和导航的网站）

## 所有Agents列表

### 文本处理Agents
- `translationAgent.ts` - 翻译
- `explanationAgent.ts` - 解释
- `contextAgent.ts` - 上下文理解

### 文章分析Agents
- `summaryAgent.ts` - 文章总结
- `keywordAgent.ts` - 关键词提取
- `storylineAgent.ts` - 故事线分析
- `sentimentAgent.ts` - 情感分析
- `entityAgent.ts` - 实体提取
- `qaAgent.ts` - 问答

### 专业分析Agents
- `sportsSummaryAgent.ts` - 体育新闻分析
- `politicsTimelineAgent.ts` - 政治新闻时间线

### 内容清理Agent
- `articleCleanerAgent.ts` - AI清理文章内容

### 协调Agents
- `masterAgent.ts` - 主协调Agent
- `enhancedMasterAgent.ts` - 增强主Agent（展示Chains, Tools, Memory）

## 服务函数列表

### 文章处理服务
- `articleParser.ts` - 解析URL获取文章内容（非Agent）
- `articleService.ts` - 文章CRUD操作
- `newsService.ts` - 新闻API获取服务

