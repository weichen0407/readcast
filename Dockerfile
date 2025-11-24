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
WORKDIR /app/backend
RUN npm install

COPY backend/ ./backend/
RUN npm run build
WORKDIR /app

# 验证构建结果
RUN ls -la /app/backend/dist/ && \
    test -f /app/backend/dist/index.js && echo "✅ Backend build successful" || (echo "❌ Backend build failed" && exit 1)

# 阶段 2: 构建 Frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app

# 复制 frontend 文件
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install

COPY frontend/ ./frontend/
RUN npm run build
WORKDIR /app

# 验证构建结果
RUN test -d /app/frontend/.output/public && echo "✅ Frontend build successful" || (echo "❌ Frontend build failed" && exit 1)

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

# 创建必要的目录
RUN mkdir -p /app/backend/storage/documents /app/backend/storage/podcasts /app/backend/data /tmp

# 最终验证所有文件
RUN echo "=== Final file verification ===" && \
    echo "Backend files:" && \
    ls -la /app/backend/ && \
    echo "Backend dist:" && \
    ls -la /app/backend/dist/ 2>/dev/null || echo "dist not found" && \
    echo "Frontend files:" && \
    ls -la /app/frontend/.output/public/ 2>/dev/null | head -5 || echo "frontend not found" && \
    test -f /app/backend/dist/index.js && echo "✅ dist/index.js exists" || (echo "❌ dist/index.js missing" && exit 1) && \
    test -f /app/backend/package.json && echo "✅ package.json exists" || (echo "❌ package.json missing" && exit 1)

# 设置工作目录
WORKDIR /app/backend

# 暴露端口
EXPOSE 3000

# 启动命令 - 添加诊断信息并确保输出不被缓冲
# 使用 shell form 以便更好地捕获错误和输出诊断信息
# 设置 NODE_ENV 和确保输出不被缓冲
CMD sh -c "echo '=== Container Starting ===' && \
           echo 'Node version:' && node --version && \
           echo 'Current directory:' && pwd && \
           echo 'Listing /app/backend/dist/:' && ls -la /app/backend/dist/ && \
           echo 'Checking if index.js exists:' && test -f /app/backend/dist/index.js && echo 'YES' || echo 'NO' && \
           echo 'Starting application...' && \
           NODE_ENV=production node /app/backend/dist/index.js"
