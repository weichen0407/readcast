# 部署调试文档

## 当前状态

### 已修复的问题
1. ✅ 删除了 `Procfile` 和 `railway.json`，避免与 Dockerfile CMD 冲突
2. ✅ 使用 `node dist/index.js` 直接启动，避免 npm 路径问题
3. ✅ 添加了文件验证步骤到 Dockerfile
4. ✅ 统一了所有阶段的工作目录为 `/app`

### Dockerfile 结构
- **阶段 1 (Backend 构建)**: `WORKDIR /app` → 复制到 `./backend/` → 构建
- **阶段 2 (Frontend 构建)**: `WORKDIR /app` → 复制到 `./frontend/` → 构建
- **阶段 3 (生产运行)**: `WORKDIR /app` → 复制文件 → `WORKDIR /app/backend` → `CMD ["node", "dist/index.js"]`

### 文件路径验证
Dockerfile 现在会在构建时验证：
- `/app/backend/package.json` 是否存在
- `/app/backend/dist/index.js` 是否存在
- `/app/backend/dist/` 目录结构

## 可能的问题

### 1. npm 路径问题（已修复）
- **问题**: `npm start` 在寻找 `/app/backend/backend/package.json`
- **原因**: 可能是 Railway 使用了其他配置文件
- **解决**: 删除了 `Procfile` 和 `railway.json`，直接使用 `node dist/index.js`

### 2. 文件复制问题
- **检查**: Dockerfile 中的验证步骤会显示文件是否存在
- **如果失败**: 检查构建日志中的文件列表

### 3. 环境变量
确保在 Railway 中设置了：
- `DEEPSEEK_API_KEY`
- `MINIMAX_API_KEY`
- `JWT_SECRET`
- `NODE_ENV=production`
- `PORT=3000` (Railway 会自动设置)

### 4. 前端路径问题
- **代码中的路径**: `path.join(__dirname, '../../frontend/.output/public')`
- **在 Docker 中**: `__dirname` = `/app/backend/dist`
- **实际路径**: `/app/frontend/.output/public` ✅ 正确

## 调试步骤

### 1. 查看构建日志
在 Railway 构建日志中查找：
```
=== Verifying copied files ===
=== Checking /app structure ===
=== Checking /app/backend structure ===
✅ package.json found at /app/backend/package.json
✅ dist/index.js found
```

### 2. 查看运行日志
应用启动后应该看到：
```
🔧 Initializing database...
📂 Database path: /tmp/read.db
✅ Database connection established
✅ Database initialized successfully
✅ Server running on port 3000
📝 Environment: production
🌐 Health check: http://0.0.0.0:3000/api/health
```

### 3. 测试健康检查
访问：`https://your-app.railway.app/api/health`
应该返回：`{ "status": "ok" }`

## 如果仍然失败

### 检查构建日志
1. 查看文件验证输出
2. 确认 `dist/index.js` 是否存在
3. 确认 `package.json` 是否存在

### 检查运行日志
1. 查看数据库初始化是否成功
2. 查看服务器是否启动
3. 查看是否有错误信息

### 手动测试
如果可能，可以在本地构建 Docker 镜像测试：
```bash
docker build -t readcast-test .
docker run -p 3000:3000 -e NODE_ENV=production readcast-test
```

## 下一步

1. 等待 Railway 构建完成
2. 查看构建日志中的验证输出
3. 查看运行日志中的启动信息
4. 测试健康检查端点

