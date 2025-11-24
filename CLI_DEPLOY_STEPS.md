# Railway CLI 部署步骤

## 第一步：登录 Railway

请在终端运行：
```bash
railway login
```

这会打开浏览器让你登录 Railway 账户。

## 第二步：初始化项目

登录后，运行：
```bash
railway init
```

选择 "Create a new project"，项目名称：`readcast`

## 第三步：设置环境变量

运行以下命令设置环境变量：

```bash
railway variables set DEEPSEEK_API_KEY=你的DeepSeek密钥
railway variables set MINIMAX_API_KEY=你的Minimax密钥
railway variables set JWT_SECRET=4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
railway variables set NODE_ENV=production
```

## 第四步：部署

```bash
railway up
```

## 第五步：查看状态和日志

```bash
# 查看部署状态
railway status

# 查看实时日志
railway logs --follow

# 打开项目网页
railway open
```

## 或者使用一键脚本

我已经创建了 `deploy-railway.sh` 脚本，运行：

```bash
./deploy-railway.sh
```

脚本会引导你完成所有步骤。

