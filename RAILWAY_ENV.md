# Railway 环境变量配置

## 必需的环境变量

在 Railway 项目设置中添加以下环境变量：

### 1. DEEPSEEK_API_KEY
```
DEEPSEEK_API_KEY=你的DeepSeek API密钥
```
- 获取地址：https://platform.deepseek.com/
- 用途：用于所有 AI Agent 功能

### 2. MINIMAX_API_KEY
```
MINIMAX_API_KEY=你的Minimax API密钥
```
- 获取地址：https://www.minimax.com/
- 用途：用于播客音频生成

### 3. JWT_SECRET
```
JWT_SECRET=生成的随机密钥
```
- 生成方法：运行 `openssl rand -base64 32`
- 用途：用于用户认证和 JWT token 签名
- **重要**：请使用强随机密钥，不要使用示例值

### 4. NODE_ENV
```
NODE_ENV=production
```
- 用途：设置生产环境模式

## 可选的环境变量

### DATABASE_PATH
```
DATABASE_PATH=/tmp/database.db
```
- 默认值：`/tmp/database.db`
- 注意：Railway 的临时文件系统会在重启时清空，建议使用 PostgreSQL 插件

### PORT
```
PORT=3001
```
- Railway 会自动设置此变量，通常不需要手动配置

### API_BASE
```
API_BASE=/api
```
- 默认值：`/api`
- 用于前端 API 请求路径

## 快速配置步骤

1. 在 Railway 项目页面点击 "Variables" 标签
2. 点击 "New Variable" 添加每个变量
3. 复制上面的变量名和值（替换为实际值）
4. 保存后 Railway 会自动重新部署

## 生成 JWT_SECRET

在本地终端运行：
```bash
openssl rand -base64 32
```

复制生成的字符串作为 `JWT_SECRET` 的值。

## 安全提示

- ✅ 不要在代码中硬编码 API 密钥
- ✅ 使用强随机密钥作为 JWT_SECRET
- ✅ 定期轮换 API 密钥
- ✅ 不要在公开场合分享环境变量值

