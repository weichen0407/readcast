#!/bin/bash

# Railway CLI 快速部署脚本

set -e

echo "🚀 ReadCast Railway 部署脚本"
echo "=============================="
echo ""

# 检查 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安装"
    echo ""
    echo "请先安装 Railway CLI:"
    echo "  macOS: brew install railway"
    echo "  或: npm install -g @railway/cli"
    echo ""
    exit 1
fi

echo "✅ Railway CLI 已安装"
railway --version
echo ""

# 检查是否已登录
if ! railway whoami &> /dev/null; then
    echo "🔐 需要登录 Railway"
    railway login
    echo ""
fi

echo "✅ 已登录 Railway"
railway whoami
echo ""

# 检查项目是否已初始化
if [ ! -f ".railway" ] && [ ! -f "railway.json" ]; then
    echo "📦 初始化 Railway 项目..."
    railway init
    echo ""
fi

echo "📋 当前项目信息:"
railway status
echo ""

# 设置环境变量
echo "🔧 设置环境变量..."
echo ""
read -p "是否现在设置环境变量? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "请输入以下环境变量的值："
    echo ""
    
    read -p "DEEPSEEK_API_KEY: " deepseek_key
    if [ -n "$deepseek_key" ]; then
        railway variables set DEEPSEEK_API_KEY="$deepseek_key"
        echo "✅ DEEPSEEK_API_KEY 已设置"
    fi
    
    read -p "MINIMAX_API_KEY: " minimax_key
    if [ -n "$minimax_key" ]; then
        railway variables set MINIMAX_API_KEY="$minimax_key"
        echo "✅ MINIMAX_API_KEY 已设置"
    fi
    
    railway variables set JWT_SECRET="4iDgESsMx8LvOFG01pQlQl9cLxIxrDfhYWu0VKZwX9Y="
    echo "✅ JWT_SECRET 已设置（使用生成的密钥）"
    
    railway variables set NODE_ENV="production"
    echo "✅ NODE_ENV 已设置"
    echo ""
fi

# 部署
echo "🚀 开始部署..."
echo ""
read -p "是否现在部署到 Railway? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "正在部署..."
    railway up
    echo ""
    echo "✅ 部署完成！"
    echo ""
    echo "📊 查看部署状态:"
    railway status
    echo ""
    echo "📝 查看日志:"
    echo "   railway logs --follow"
    echo ""
    echo "🌐 打开项目:"
    echo "   railway open"
    echo ""
else
    echo "跳过部署。你可以稍后运行: railway up"
fi

