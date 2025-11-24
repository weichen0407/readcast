# Railway 部署指南

## 部署步骤

### 1. 准备代码

确保所有代码已提交到 Git 仓库。

### 2. 在 Railway 创建项目

1. 访问 [Railway](https://railway.app)
2. 登录你的账户
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"（如果已连接 GitHub）或 "Empty Project"

### 3. 配置环境变量

在 Railway 项目设置中添加以下环境变量：

#### 必需的环境变量：

```
# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key

# Minimax API (用于播客生成)
MINIMAX_API_KEY=your_minimax_api_key

# JWT Secret (用于用户认证)
JWT_SECRET=your_jwt_secret_key_here

# 数据库路径（Railway 会自动处理）
DATABASE_PATH=/tmp/database.db

# Node 环境
NODE_ENV=production

# 端口（Railway 会自动设置）
PORT=3001
```

#### 可选的环境变量：

```
# API Base URL（如果需要）
API_BASE=/api
```

### 4. 配置构建和启动

Railway 会自动检测 `nixpacks.toml` 或 `Procfile` 配置。

- **构建命令**：会自动运行 `npm run install:all && npm run build:backend && npm run build:frontend`
- **启动命令**：`cd backend && npm start`

### 5. 部署

1. 连接你的 GitHub 仓库（如果还没连接）
2. 选择要部署的分支（通常是 `main` 或 `master`）
3. Railway 会自动开始构建和部署

### 6. 配置域名（可选）

1. 在项目设置中点击 "Settings"
2. 在 "Domains" 部分添加自定义域名
3. Railway 会自动配置 SSL 证书

## 注意事项

### 数据库持久化

Railway 的临时文件系统会在重启时清空。如果需要持久化数据库：

1. 使用 Railway 的 PostgreSQL 插件（推荐）
2. 或者使用外部数据库服务

### 文件存储

生成的 PDF 和播客文件存储在 `backend/storage/` 目录。在 Railway 上，这些文件是临时的。如果需要持久化：

1. 使用 Railway 的 Volume 插件
2. 或者使用外部存储服务（如 AWS S3、Cloudinary 等）

### 字体文件

中文字体文件较大，已从 Git 中排除。部署时需要：

1. 在 Railway 上通过环境变量或 Volume 提供字体文件
2. 或者使用在线字体服务

### 前端 API 配置

确保前端能正确连接到后端 API。在 `frontend/nuxt.config.ts` 中：

```typescript
runtimeConfig: {
  public: {
    apiBase: process.env.API_BASE || "/api",
  },
}
```

在生产环境中，如果前后端部署在同一域名下，使用 `/api` 即可。

## 故障排查

### 构建失败

- 检查环境变量是否都已设置
- 查看 Railway 构建日志
- 确保所有依赖都已正确安装

### 运行时错误

- 检查数据库路径是否正确
- 确认所有必需的环境变量都已设置
- 查看 Railway 日志

### 前端无法访问后端

- 检查 CORS 配置
- 确认 API 路径配置正确
- 查看浏览器控制台错误

## 更新部署

每次推送到 GitHub 后，Railway 会自动重新部署。你也可以在 Railway 控制台手动触发部署。

