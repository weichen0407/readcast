# 部署到 Railway 完整指南

## 步骤 1: 推送到 GitHub

### 1.1 在 GitHub 创建仓库

1. 访问 [GitHub](https://github.com)
2. 点击右上角的 "+" → "New repository"
3. 填写仓库名称（例如：`readcast`）
4. 选择 Public 或 Private
5. **不要**勾选 "Initialize this repository with a README"
6. 点击 "Create repository"

### 1.2 连接本地仓库到 GitHub

```bash
# 在项目根目录执行
cd /Users/jerry/Developer/read

# 添加远程仓库（替换 YOUR_USERNAME 和 YOUR_REPO_NAME）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 或者使用 SSH（如果你配置了 SSH key）
# git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

## 步骤 2: 在 Railway 部署

### 2.1 创建 Railway 账户

1. 访问 [Railway](https://railway.app)
2. 点击 "Start a New Project"
3. 使用 GitHub 账户登录（推荐）

### 2.2 创建新项目

1. 登录后，点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 授权 Railway 访问你的 GitHub 账户（如果还没授权）
4. 选择你刚创建的仓库
5. Railway 会自动检测配置并开始部署

### 2.3 配置环境变量

在 Railway 项目页面：

1. 点击项目名称进入项目详情
2. 点击 "Variables" 标签
3. 添加以下环境变量：

#### 必需变量：

```
DEEPSEEK_API_KEY=你的DeepSeek API密钥
MINIMAX_API_KEY=你的Minimax API密钥
JWT_SECRET=一个随机的JWT密钥（可以使用 openssl rand -base64 32 生成）
NODE_ENV=production
```

#### 可选变量：

```
API_BASE=/api
DATABASE_PATH=/tmp/database.db
```

### 2.4 配置构建设置

Railway 会自动检测 `nixpacks.toml` 和 `Procfile`，但你可以手动检查：

1. 在项目设置中，确保：
   - **Build Command**: `npm run install:all && npm run build:backend && npm run build:frontend`
   - **Start Command**: `cd backend && npm start`
   - **Root Directory**: `/` (项目根目录)

### 2.5 等待部署完成

Railway 会自动：
1. 安装依赖
2. 构建后端和前端
3. 启动服务

你可以在 "Deployments" 标签查看部署日志。

## 步骤 3: 配置域名（可选）

1. 在项目设置中点击 "Settings"
2. 在 "Domains" 部分
3. 点击 "Generate Domain" 获取 Railway 提供的免费域名
4. 或者添加自定义域名

## 步骤 4: 验证部署

1. 访问 Railway 提供的域名或你的自定义域名
2. 检查应用是否正常运行
3. 测试主要功能：
   - 用户注册/登录
   - 获取新闻
   - 阅读文章
   - 生成 ReadCast 文档

## 常见问题

### 构建失败

**问题**: 构建过程中出现错误

**解决方案**:
- 检查 Railway 构建日志
- 确认所有环境变量都已设置
- 检查 `package.json` 中的脚本是否正确

### 运行时错误

**问题**: 应用启动后出现错误

**解决方案**:
- 查看 Railway 日志
- 确认数据库路径正确
- 检查环境变量是否正确设置

### 前端无法访问后端 API

**问题**: 前端页面加载但 API 请求失败

**解决方案**:
- 确认 `API_BASE` 环境变量设置为 `/api`
- 检查 CORS 配置
- 查看浏览器控制台错误信息

### 数据库问题

**问题**: 数据库文件丢失

**解决方案**:
- Railway 的临时文件系统会在重启时清空
- 考虑使用 Railway 的 PostgreSQL 插件
- 或者使用外部数据库服务

### 文件存储问题

**问题**: 生成的 PDF 和播客文件丢失

**解决方案**:
- 使用 Railway 的 Volume 插件持久化存储
- 或者集成外部存储服务（AWS S3、Cloudinary 等）

## 更新部署

每次你推送代码到 GitHub 的 `main` 分支，Railway 会自动重新部署。

你也可以在 Railway 控制台手动触发部署：
1. 进入项目
2. 点击 "Deployments"
3. 点击 "Redeploy"

## 监控和日志

- **日志**: 在 Railway 项目页面查看实时日志
- **指标**: 查看 CPU、内存使用情况
- **告警**: 配置告警规则（需要付费计划）

## 成本

Railway 提供：
- **免费计划**: $5 免费额度/月
- **付费计划**: 按使用量付费

对于小型项目，免费计划通常足够使用。

## 需要帮助？

- Railway 文档: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- 项目 README: 查看 `README.md`

