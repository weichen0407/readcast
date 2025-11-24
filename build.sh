#!/bin/bash
# Railway 构建脚本

set -e

echo "Building ReadCast..."

# 安装依赖
if [ -d "backend" ]; then
  echo "Installing backend dependencies..."
  cd backend
  npm install
  cd ..
fi

if [ -d "frontend" ]; then
  echo "Installing frontend dependencies..."
  cd frontend
  npm install
  cd ..
fi

# 构建
if [ -d "backend" ]; then
  echo "Building backend..."
  cd backend
  npm run build
  cd ..
fi

if [ -d "frontend" ]; then
  echo "Building frontend..."
  cd frontend
  npm run build
  cd ..
fi

echo "Build completed!"

