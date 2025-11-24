#!/bin/bash

# Railway CLI 一键部署脚本

set -e

echo "🚀 ReadCast Railway 部署"
echo "========================"
echo ""

# 检查 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安装"
    echo "安装命令: brew install railway"
    exit 1
fi

echo "✅ Railway CLI: $(railway --version)"
echo ""

# 检查登录状态
if ! railway whoami &> /dev/null; then
    echo "🔐 请先登录 Railway（会打开浏览器）"
    railway login
    echo ""
fi

echo "✅ 已登录: $(railway whoami)"
echo ""

# 检查项目
if [ ! -f ".railway" ] && [ ! -f "railway.json" ]; then
    echo "📦 初始化 Railway 项目..."
    railway init
    echo ""
fi

echo "📋 当前项目:"
railway status
echo ""

# 设置环境变量
echo "🔧 设置环境变量..."
echo ""

# 检查是否已设置
if railway variables get DEEPSEEK_API_KEY &> /dev/null; then
    echo "✅ 环境变量已存在"
    railway variables
else
    echo "⚠️  环境变量未设置，请运行以下命令："
    echo ""
    echo "railway variables set DEEPSEEK_API_KEY=你的密钥"
    echo "railway variables set MINIMAX_API_KEY=你的密钥"
    echo "railway variables set JWT_SECRET=4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y="
    echo "railway variables set NODE_ENV=production"
    echo ""
    read -p "是否现在设置环境变量? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "DEEPSEEK_API_KEY: " deepseek_key
        [ -n "$deepseek_key" ] && railway variables set DEEPSEEK_API_KEY="$deepseek_key"
        
        read -p "MINIMAX_API_KEY: " minimax_key
        [ -n "$minimax_key" ] && railway variables set MINIMAX_API_KEY="$minimax_key"
        
        railway variables set JWT_SECRET="4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y="
        railway variables set NODE_ENV="production"
        echo "✅ 环境变量已设置"
    fi
fi

echo ""
echo "🚀 开始部署..."
railway up

echo ""
echo "✅ 部署完成！"
echo ""
echo "📊 查看状态: railway status"
echo "📝 查看日志: railway logs --follow"
echo "🌐 打开项目: railway open"
