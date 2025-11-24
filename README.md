# ReadCast

一个基于 Nuxt 3 和 Node.js 的智能英语学习平台，集成了 LangChain 1.0 多 Agent 系统，支持文章解析、单词查询、段落翻译解释、主题总结和时间线提取。通过 ReadCast，你可以阅读英语新闻、学习知识点、生成复习文档和播客。

## 功能特性

- 📰 **文章输入与解析**：支持文本输入和 URL 输入，自动提取正文内容
- 📖 **文章展示**：美观的文章阅读界面，每个单词可点击查询
- 🔍 **单词查询**：点击单词即可查看释义、音标和读音（使用 Free Dictionary API）
- 🤖 **LangChain Agents**：
  - Translation Agent：翻译选中段落
  - Explanation Agent：结合文章主题解释段落
  - Sports Summary Agent：总结体育新闻主题和背景
  - Politics Timeline Agent：提取政治新闻时间线
  - Master Agent：协调多个子 Agent
- ⭐ **收藏功能**：收藏喜欢的文章和句子
- 🎯 **智能分析**：自动识别文章类型（体育/政治），提供相应分析
- 📄 **ReadCast 文档生成**：根据难度级别生成知识点难点文档（PDF 格式）
- 🎙️ **播客生成**：将文档转换为播客音频（支持单人/对话模式，使用 Minimax TTS）
- 📚 **收藏复习**：支持总结今日收藏或选择收藏生成复习文档

## 技术栈

### 前端

- Nuxt 3 (Vue 3)
- TypeScript
- 响应式设计

### 后端

- Node.js + Express
- TypeScript
- SQLite 数据库
- LangChain 1.0
- DeepSeek API
- Cheerio (HTML 解析)

## 项目结构

```
/read
├── frontend/          # Nuxt 3 前端应用
│   ├── pages/        # 页面路由
│   ├── components/   # Vue 组件
│   ├── composables/  # 组合式函数
│   └── types/        # TypeScript 类型定义
├── backend/          # Node.js 后端
│   ├── src/
│   │   ├── agents/   # LangChain Agents
│   │   ├── services/ # 业务逻辑
│   │   ├── models/   # 数据模型
│   │   ├── routes/   # API 路由
│   │   └── db/       # 数据库配置
│   └── db/           # 数据库文件
└── README.md
```

## 安装和运行

### 前置要求

- Node.js 18+
- npm 或 yarn

### 后端设置

1. 进入后端目录：

```bash
cd backend
```

2. 安装依赖：

```bash
npm install
```

3. 配置环境变量：
   创建 `.env` 文件：

```
PORT=3001
DATABASE_PATH=./db/read.db
DEEPSEEK_API_KEY=your_deepseek_api_key
MINIMAX_API_KEY=your_minimax_api_key
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

**注意**：

- 请将 `your_deepseek_api_key` 替换为你的 DeepSeek API 密钥。DeepSeek API 密钥可以在 [DeepSeek 官网](https://platform.deepseek.com/) 获取。
- 请将 `your_minimax_api_key` 替换为你的 Minimax API 密钥。Minimax API 密钥可以在 [Minimax 开放平台](https://platform.minimaxi.com/) 获取（用于 TTS 播客生成）。
- `JWT_SECRET` 用于 JWT token 加密，请设置一个随机字符串。

4. 启动后端服务：

```bash
npm run dev
```

后端服务将在 `http://localhost:3001` 运行。

### 前端设置

1. 进入前端目录：

```bash
cd frontend
```

2. 安装依赖：

```bash
npm install
```

3. 配置 API 地址（如需要）：
   在 `nuxt.config.ts` 中修改 `apiBase`，或设置环境变量 `API_BASE`。

4. 启动前端开发服务器：

```bash
npm run dev
```

前端应用将在 `http://localhost:3000` 运行（如果后端也在 3000 端口，Nuxt 会自动使用其他端口）。

## 使用说明

### 1. 输入文章

- **文本输入**：在首页选择"输入文本"，粘贴文章内容
- **URL 输入**：选择"输入 URL"，输入文章链接，系统会自动解析正文

### 2. 阅读文章

- 点击任意单词查看释义和读音
- 选择一段文字（拖拽或点击单词块）进行翻译或解释

### 3. 分析文章

- 点击"分析文章"按钮，系统会自动：
  - 识别文章类型（体育/政治/一般）
  - 提供相应的分析（主题总结、时间线等）

### 4. 收藏功能

- **收藏文章**：点击文章页面的"收藏"按钮收藏整篇文章
- **收藏句子**：在文章中选择文本后，点击右侧面板的"收藏句子"按钮
- **查看收藏**：在收藏页面可以查看所有收藏的句子

### 5. ReadCast 文档生成

- **生成文章文档**：
  - 在文章详情页面点击"📄"按钮
  - 选择难度级别（低/中/高）
  - 输入自定义要求（可选）
  - 生成知识点难点文档（PDF 格式）
- **生成播客**：
  - 文档生成后，选择播客模式（单人/对话）
  - 点击"生成播客"按钮
  - 下载生成的 MP3 音频文件

### 6. 收藏复习文档

- 在收藏页面点击"📄 ReadCast"按钮
- 选择生成类型：
  - **今日收藏**：汇总当天所有收藏
  - **选择收藏**：选择特定的收藏内容
- 选择难度和自定义要求
- 生成复习文档和播客

## API 端点

### 文章相关

- `POST /api/articles` - 创建文章
- `GET /api/articles` - 获取所有文章
- `GET /api/articles/:id` - 获取文章详情
- `POST /api/articles/:id/analyze` - 分析文章
- `POST /api/articles/:id/translate` - 翻译选中文本
- `POST /api/articles/:id/explain` - 解释选中文本

### 词典相关

- `GET /api/dictionary/:word` - 查询单词

### 收藏相关

- `GET /api/favorites` - 获取收藏列表
- `GET /api/favorites/sentences` - 获取收藏的句子
- `POST /api/favorites/:articleId` - 切换收藏状态
- `GET /api/favorites/:articleId/status` - 检查收藏状态
- `POST /api/favorites/sentences` - 收藏句子

### ReadCast 相关

- `POST /api/readcast/article/generate` - 生成文章文档
- `POST /api/readcast/article/podcast` - 生成文章播客
- `POST /api/readcast/favorites/generate` - 生成收藏文档
- `POST /api/readcast/favorites/podcast` - 生成收藏播客
- `GET /api/readcast/download/:type/:filename` - 下载 PDF 或音频文件

## LangChain Agents 说明

### Translation Agent

负责将选中的英文段落翻译成中文，考虑文章上下文。

### Explanation Agent

结合文章主题和类型，详细解释选中段落，包括专业术语和文化背景。

### Sports Summary Agent

针对体育新闻（NBA、足球等），提取：

- 主题和背景
- 关键事件
- 专业术语解释

### Politics Timeline Agent

针对政治新闻，提取：

- 时间线事件
- 关键人物
- 重要地点
- 整体总结

### Master Agent

协调多个子 Agent，根据文章类型自动路由到合适的 Agent。

## 开发说明

### 数据库

项目使用 SQLite 数据库，数据库文件位于 `backend/db/read.db`。

主要表结构：

- `articles` - 文章表
- `favorites` - 收藏表
- `analyses` - 分析结果表

### 环境变量

后端需要配置：

- `DEEPSEEK_API_KEY` - DeepSeek API 密钥（用于 AI Agent）
- `MINIMAX_API_KEY` - Minimax API 密钥（用于 TTS 播客生成）
- `JWT_SECRET` - JWT 加密密钥（用于用户认证）
- `PORT` - 服务器端口（默认 3001）
- `DATABASE_PATH` - 数据库文件路径

## 许可证

MIT
