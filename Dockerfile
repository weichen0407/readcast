# 多阶段构建 Dockerfile for ReadCast

# 阶段 1: 构建 Backend
FROM node:20-slim AS backend-builder

# 安装构建工具（用于编译原生模块）
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制 backend 文件
COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/
RUN cd backend && npm run build

# 阶段 2: 构建 Frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app

# 复制 frontend 文件
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# 阶段 3: 生产运行环境
FROM node:20-slim

# 安装运行时依赖（ffmpeg 用于播客生成）
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从构建阶段复制文件
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=frontend-builder /app/frontend/.output/public ./frontend/.output/public

# 验证复制的文件
RUN echo "=== Verifying copied files ===" && \
    ls -la /app/backend/ && \
    ls -la /app/backend/dist/ 2>/dev/null || echo "dist directory not found" && \
    test -f /app/backend/dist/index.js && echo "✅ dist/index.js exists" || echo "❌ dist/index.js missing"

# 复制必要的配置文件（如果存在）
# 注意：环境变量应该通过 Railway 的 Variables 设置，不需要复制 .env 文件

# 创建必要的目录
RUN mkdir -p ./backend/storage/documents ./backend/storage/podcasts ./backend/data /tmp

# 验证文件是否存在（调试用）
RUN echo "=== Checking /app structure ===" && \
    ls -la /app/ && \
    echo "=== Checking /app/backend structure ===" && \
    ls -la /app/backend/ && \
    echo "=== Checking if package.json exists ===" && \
    test -f /app/backend/package.json && echo "✅ package.json found at /app/backend/package.json" || echo "❌ package.json NOT found" && \
    echo "=== Checking if dist/index.js exists ===" && \
    test -f /app/backend/dist/index.js && echo "✅ dist/index.js found" || echo "❌ dist/index.js NOT found"

WORKDIR /app/backend

# 暴露端口
EXPOSE 3000

# 启动命令 - 使用绝对路径确保正确
# 使用 exec form 确保正确的工作目录
CMD ["node", "dist/index.js"]

