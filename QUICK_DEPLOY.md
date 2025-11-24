# 快速部署指南

## 方式一：使用部署脚本（推荐）

```bash
./deploy.sh
```

脚本会自动检查并帮助你推送到 GitHub。

## 方式二：手动部署

### 步骤 1: 创建 GitHub 仓库

1. 访问 https://github.com/new
2. 仓库名称：`readcast`（或你喜欢的名字）
3. 选择 Public 或 Private
4. **不要**勾选 "Initialize with README"
5. 点击 "Create repository"

### 步骤 2: 推送到 GitHub

```bash
# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/readcast.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 步骤 3: 在 Railway 部署

1. **访问 Railway**
   - 打开 https://railway.app
   - 使用 GitHub 账户登录

2. **创建项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 授权 Railway 访问 GitHub（如果还没授权）
   - 选择你的 `readcast` 仓库

3. **配置环境变量**
   - 在项目页面点击 "Variables" 标签
   - 添加以下变量：

```
DEEPSEEK_API_KEY=你的DeepSeek密钥
MINIMAX_API_KEY=你的Minimax密钥
JWT_SECRET=生成的随机密钥（见下方命令）
NODE_ENV=production
```

生成 JWT_SECRET：
```bash
openssl rand -base64 32
```

4. **等待部署**
   - Railway 会自动检测配置并开始构建
   - 查看 "Deployments" 标签的构建日志
   - 部署完成后会显示访问 URL

5. **配置域名（可选）**
   - 在项目 "Settings" → "Domains"
   - 点击 "Generate Domain" 获取免费域名
   - 或添加自定义域名

## 验证部署

部署完成后：
1. 访问 Railway 提供的 URL
2. 测试注册/登录功能
3. 测试获取新闻功能
4. 测试 ReadCast 文档生成

## 需要帮助？

- 查看详细文档：`DEPLOY.md`
- Railway 文档：https://docs.railway.app

