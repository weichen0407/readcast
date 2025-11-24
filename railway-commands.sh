#!/bin/bash
# Railway CLI 部署命令集合
# 复制这些命令到终端执行

# 1. 登录 Railway（会打开浏览器）
railway login

# 2. 初始化项目
railway init

# 3. 设置环境变量（替换为你的实际密钥）
railway variables set DEEPSEEK_API_KEY=你的DeepSeek密钥
railway variables set MINIMAX_API_KEY=你的Minimax密钥
railway variables set JWT_SECRET=4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
railway variables set NODE_ENV=production

# 4. 部署
railway up

# 5. 查看状态
railway status

# 6. 查看日志
railway logs --follow

# 7. 打开项目网页
railway open

