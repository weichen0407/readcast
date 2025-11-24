# 环境变量设置指南

## 已生成的密钥

✅ **JWT_SECRET** 已生成：
```
4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
```

## Railway 环境变量配置

在 Railway 项目设置中添加以下环境变量：

### 必需变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DEEPSEEK_API_KEY` | 你的 DeepSeek API 密钥 | 从 https://platform.deepseek.com/ 获取 |
| `MINIMAX_API_KEY` | 你的 Minimax API 密钥 | 从 https://www.minimax.com/ 获取 |
| `JWT_SECRET` | `4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=` | 已生成，直接使用 |
| `NODE_ENV` | `production` | 生产环境模式 |

### 配置步骤

1. 在 Railway 项目页面，点击 **"Variables"** 标签
2. 点击 **"New Variable"** 按钮
3. 逐个添加以下变量：

```
变量名: DEEPSEEK_API_KEY
值: 你的实际 DeepSeek API 密钥
```

```
变量名: MINIMAX_API_KEY
值: 你的实际 Minimax API 密钥
```

```
变量名: JWT_SECRET
值: 4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
```

```
变量名: NODE_ENV
值: production
```

4. 保存后，Railway 会自动重新部署

## 快速复制配置

### 方式一：在 Railway Web 界面手动添加

按照上面的表格逐个添加。

### 方式二：使用 Railway CLI（如果已安装）

```bash
railway variables set DEEPSEEK_API_KEY=你的密钥
railway variables set MINIMAX_API_KEY=你的密钥
railway variables set JWT_SECRET=4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
railway variables set NODE_ENV=production
```

## 验证配置

部署完成后，检查：
1. Railway 构建日志没有错误
2. 应用可以正常访问
3. 可以注册/登录用户
4. 可以获取新闻和生成文档

## 安全提示

⚠️ **重要**：
- 不要将 API 密钥提交到 Git
- 不要在公开场合分享环境变量值
- JWT_SECRET 已生成，请妥善保管
- 如果密钥泄露，请立即更换

## 需要重新生成 JWT_SECRET？

如果需要在本地重新生成：

```bash
openssl rand -base64 32
```

然后在 Railway 中更新 `JWT_SECRET` 的值。

