# 快速启动指南

## 一键安装依赖

在项目根目录运行：

```bash
npm run install:all
```

或者分别安装：

```bash
# 后端
cd backend && npm install

# 前端
cd frontend && npm install
```

## 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
PORT=3000
DATABASE_PATH=./db/read.db
DEEPSEEK_API_KEY=sk-d156bcc33ae141f39abf83256afc7988
NODE_ENV=development
```

## 启动项目

### 方式一：分别启动（推荐用于开发）

打开两个终端窗口：

**终端 1 - 启动后端：**
```bash
cd backend
npm run dev
```

**终端 2 - 启动前端：**
```bash
cd frontend
npm run dev
```

### 方式二：使用根目录脚本

```bash
# 启动后端（新终端）
npm run dev:backend

# 启动前端（新终端）
npm run dev:frontend
```

## 访问应用

- 前端：http://localhost:3000 (或 Nuxt 自动分配的端口)
- 后端 API：http://localhost:3000/api

## 测试功能

1. **输入文章**：访问首页，输入一段英文文本或 URL
2. **查看文章**：点击文章进入阅读页面
3. **查询单词**：点击任意单词查看释义
4. **选择文本**：拖拽选择一段文字，点击"翻译"或"解释"
5. **分析文章**：点击"分析文章"按钮查看智能分析
6. **收藏文章**：点击收藏按钮保存文章

## 常见问题

### 后端启动失败

- 检查 `.env` 文件是否存在且配置正确
- 确认 `DEEPSEEK_API_KEY` 已设置
- 检查端口 3000 是否被占用

### 前端无法连接后端

- 确认后端服务已启动
- 检查 `nuxt.config.ts` 中的 `apiBase` 配置
- 查看浏览器控制台的错误信息

### 数据库错误

- 确认 `backend/db` 目录存在
- 检查数据库文件权限

