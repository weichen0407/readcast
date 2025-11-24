# Railway CLI 部署指南

## 1. 安装 Railway CLI

### macOS
```bash
brew install railway
```

### 或使用 npm
```bash
npm install -g @railway/cli
```

### 验证安装
```bash
railway --version
```

## 2. 登录 Railway

```bash
railway login
```

这会打开浏览器让你登录 Railway 账户。

## 3. 初始化项目

在项目根目录运行：

```bash
railway init
```

这会：
- 创建一个新的 Railway 项目（或连接到现有项目）
- 生成 `railway.json` 配置文件

## 4. 链接到现有项目（可选）

如果你已经在 Railway 网页上创建了项目：

```bash
railway link
```

然后选择你的项目。

## 5. 设置环境变量

### 方式一：使用 CLI 逐个设置

```bash
railway variables set DEEPSEEK_API_KEY=你的DeepSeek密钥
railway variables set MINIMAX_API_KEY=你的Minimax密钥
railway variables set JWT_SECRET=4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
railway variables set NODE_ENV=production
```

### 方式二：从文件导入（推荐）

创建 `railway.env` 文件（不要提交到 Git）：

```bash
# 创建环境变量文件
cat > railway.env << EOF
DEEPSEEK_API_KEY=你的DeepSeek密钥
MINIMAX_API_KEY=你的Minimax密钥
JWT_SECRET=4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
NODE_ENV=production
EOF

# 导入环境变量
railway variables --file railway.env
```

### 方式三：交互式设置

```bash
railway variables
```

这会打开交互式界面让你设置变量。

## 6. 部署

### 部署到生产环境

```bash
railway up
```

这会：
- 构建项目
- 部署到 Railway
- 显示部署日志

### 查看部署状态

```bash
railway status
```

### 查看日志

```bash
railway logs
```

实时查看日志：
```bash
railway logs --follow
```

## 7. 常用命令

### 查看项目信息
```bash
railway status
```

### 打开项目网页
```bash
railway open
```

### 查看环境变量
```bash
railway variables
```

### 运行本地命令（使用 Railway 环境变量）
```bash
railway run npm run dev
```

### 生成部署 URL
```bash
railway domain
```

## 8. 故障排查

### 查看构建日志
```bash
railway logs --deployment <deployment-id>
```

### 查看服务状态
```bash
railway status
```

### 重新部署
```bash
railway up
```

### 回滚到之前的版本
在 Railway 网页界面中操作，或使用：
```bash
railway rollback
```

## 9. 完整部署流程

```bash
# 1. 登录
railway login

# 2. 初始化项目（如果还没初始化）
railway init

# 3. 设置环境变量
railway variables set DEEPSEEK_API_KEY=你的密钥
railway variables set MINIMAX_API_KEY=你的密钥
railway variables set JWT_SECRET=4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
railway variables set NODE_ENV=production

# 4. 部署
railway up

# 5. 查看日志
railway logs --follow
```

## 10. 自动化部署

Railway 会自动检测 Git 推送并部署。确保：

1. 项目已连接到 GitHub
2. 在 Railway 项目设置中启用了自动部署

或者使用 Railway CLI 手动触发：

```bash
railway up
```

## 11. 环境变量管理

### 查看所有环境变量
```bash
railway variables
```

### 删除环境变量
```bash
railway variables unset VARIABLE_NAME
```

### 更新环境变量
```bash
railway variables set VARIABLE_NAME=new_value
```

## 12. 数据库持久化

Railway 的临时文件系统会在重启时清空。对于数据库：

1. **使用 Railway PostgreSQL 插件**（推荐）
   ```bash
   railway add postgresql
   ```
   然后更新 `DATABASE_PATH` 环境变量

2. **或使用外部数据库服务**

## 提示

- 使用 `railway --help` 查看所有可用命令
- 使用 `railway <command> --help` 查看特定命令的帮助
- 日志会实时显示构建和运行状态
- 部署后会自动生成一个 `.railway.app` 域名

