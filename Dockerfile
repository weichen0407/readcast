# 多阶段构建 Dockerfile for ReadCast

# 阶段 1: 构建 Backend
FROM node:20-slim AS backend-builder

# 安装构建工具（用于编译原生模块）
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# 复制 backend 文件
COPY backend/package*.json ./
RUN npm install

COPY backend/ ./
RUN npm run build

# 阶段 2: 构建 Frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# 复制 frontend 文件
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

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

# 复制必要的配置文件（如果存在）
# 注意：环境变量应该通过 Railway 的 Variables 设置，不需要复制 .env 文件

# 创建必要的目录
RUN mkdir -p ./backend/storage/documents ./backend/storage/podcasts

WORKDIR /app/backend

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]

