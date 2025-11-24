# Railway 部署故障排查指南

## 当前问题
- 部署后没有日志输出
- 应用可能没有启动

## 必需的环境变量

在 Railway 的 Variables 标签中，确保设置了以下环境变量：

### 必需变量
```
NODE_ENV=production
PORT=3000
```

### API 密钥（必需）
```
DEEPSEEK_API_KEY=你的DeepSeek密钥
MINIMAX_API_KEY=你的Minimax密钥
JWT_SECRET=4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y=
```

### 可选变量
```
DATABASE_PATH=/tmp/read.db
```

## 检查清单

### 1. 构建阶段
- [ ] 构建是否成功完成？
- [ ] 是否看到 "✅ Backend build successful"？
- [ ] 是否看到 "✅ Frontend build successful"？
- [ ] 是否看到 "✅ dist/index.js exists"？

### 2. 运行阶段
- [ ] 服务状态是什么？（Running / Crashed / Stopped）
- [ ] 是否有任何日志输出？
- [ ] 是否看到 "=== Container Starting ==="？
- [ ] 是否看到 "🚀 Starting ReadCast application..."？

### 3. 环境变量
- [ ] 所有必需的环境变量是否已设置？
- [ ] `NODE_ENV` 是否设置为 `production`？
- [ ] `PORT` 是否设置？（Railway 会自动设置，但可以手动设置）

### 4. 网络
- [ ] 服务是否有分配的域名？
- [ ] 是否可以访问健康检查端点：`https://your-app.railway.app/api/health`？

## 常见问题

### 问题 1: 没有日志
**可能原因：**
- 应用在启动前就崩溃了
- Railway 日志系统延迟
- 容器没有正确启动

**解决方法：**
1. 检查构建日志（不是运行日志）
2. 检查服务状态
3. 查看 Railway 的 "Metrics" 标签，看是否有 CPU/内存使用

### 问题 2: 应用崩溃
**可能原因：**
- 缺少环境变量
- 数据库初始化失败
- 端口冲突

**解决方法：**
1. 检查所有环境变量是否设置
2. 查看崩溃前的最后日志
3. 检查数据库路径权限

### 问题 3: 构建失败
**可能原因：**
- 依赖安装失败
- TypeScript 编译错误
- 文件路径问题

**解决方法：**
1. 查看构建日志中的具体错误
2. 检查 Dockerfile 中的路径
3. 验证文件是否正确复制

## 调试步骤

### 步骤 1: 检查构建日志
1. 在 Railway 项目页面，点击 "Deployments"
2. 点击最新的部署
3. 查看 "Build Logs"
4. 查找错误信息

### 步骤 2: 检查运行日志
1. 在 Railway 项目页面，点击服务
2. 点击 "Logs" 标签
3. 查看是否有任何输出

### 步骤 3: 检查服务状态
1. 在 Railway 项目页面，查看服务状态
2. 如果是 "Crashed"，点击查看详情
3. 检查重启策略

### 步骤 4: 验证环境变量
1. 在 Railway 项目页面，点击 "Variables"
2. 确认所有必需变量都已设置
3. 检查变量值是否正确

### 步骤 5: 测试健康检查
1. 获取服务的域名（在 Railway 项目页面）
2. 访问：`https://your-domain.railway.app/api/health`
3. 应该返回：`{"status":"ok"}`

## 如果仍然无法解决

1. **提供构建日志**：完整的构建日志输出
2. **提供运行日志**：即使只有一行，也要提供
3. **提供服务状态**：Running / Crashed / Stopped
4. **提供环境变量列表**：确认哪些已设置（隐藏敏感值）

## 快速测试

创建一个简单的测试端点来验证应用是否运行：

访问：`https://your-domain.railway.app/api/health`

如果返回 `{"status":"ok"}`，说明应用正在运行。

