#!/bin/bash

# ReadCast 部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 ReadCast 部署脚本"
echo "===================="
echo ""

# 检查是否已连接远程仓库
if git remote | grep -q origin; then
    echo "✅ 已连接到远程仓库"
    git remote -v
    echo ""
    read -p "是否要推送到 GitHub? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 推送到 GitHub..."
        git push -u origin main
        echo "✅ 推送完成！"
    fi
else
    echo "❌ 尚未连接到 GitHub 远程仓库"
    echo ""
    echo "请先执行以下步骤："
    echo ""
    echo "1. 在 GitHub 创建新仓库："
    echo "   - 访问 https://github.com/new"
    echo "   - 填写仓库名称（例如：readcast）"
    echo "   - 选择 Public 或 Private"
    echo "   - 不要勾选 'Initialize with README'"
    echo "   - 点击 'Create repository'"
    echo ""
    echo "2. 然后运行以下命令（替换 YOUR_USERNAME 和 REPO_NAME）："
    echo ""
    echo "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    echo "或者运行此脚本，它会提示你输入仓库地址"
    echo ""
    read -p "是否现在添加远程仓库? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "请输入 GitHub 仓库地址 (例如: https://github.com/username/repo.git): " repo_url
        if [ -n "$repo_url" ]; then
            git remote add origin "$repo_url"
            git branch -M main
            echo "📤 推送到 GitHub..."
            git push -u origin main
            echo "✅ 推送完成！"
        else
            echo "❌ 未输入仓库地址"
        fi
    fi
fi

echo ""
echo "📋 下一步：在 Railway 部署"
echo "===================="
echo ""
echo "1. 访问 https://railway.app 并登录"
echo "2. 点击 'New Project' → 'Deploy from GitHub repo'"
echo "3. 选择你的仓库"
echo "4. 在项目设置中添加环境变量："
echo "   - DEEPSEEK_API_KEY"
echo "   - MINIMAX_API_KEY"
echo "   - JWT_SECRET (使用: openssl rand -base64 32)"
echo "   - NODE_ENV=production"
echo ""
echo "详细步骤请查看 DEPLOY.md 文件"
echo ""

