# 启动说明

## 重要：端口配置

- **后端服务器**：运行在 `http://localhost:3001`
- **前端服务器**：运行在 `http://localhost:3000`
- **API 代理**：前端通过 Nitro 代理将 `/api` 请求转发到后端

## 启动步骤

### 1. 启动后端（终端 1）

```bash
cd backend
npm run dev
```

后端将在 `http://localhost:3001` 启动。

### 2. 启动前端（终端 2）

```bash
cd frontend
npm run dev
```

前端将在 `http://localhost:3000` 启动。

### 3. 访问应用

打开浏览器访问：`http://localhost:3000`

## 验证后端是否运行

在浏览器或终端中访问：
```bash
curl http://localhost:3001/api/health
```

应该返回：
```json
{"status":"ok"}
```

## 故障排除

如果遇到 404 错误：

1. **检查后端是否运行**：
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **检查端口占用**：
   ```bash
   lsof -ti:3001  # 检查后端端口
   lsof -ti:3000  # 检查前端端口
   ```

3. **重启服务**：
   - 停止所有服务（Ctrl+C）
   - 先启动后端，再启动前端

