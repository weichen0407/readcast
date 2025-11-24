#!/bin/bash
# Railway CLI 部署脚本 - 修复版

set -e

echo "🚀 ReadCast Railway 部署"
echo "========================"
echo ""

# 检查登录
if ! railway whoami &> /dev/null; then
    echo "请先登录: railway login"
    exit 1
fi

echo "✅ 已登录: $(railway whoami)"
echo ""

# 检查项目
if [ ! -f ".railway" ]; then
    echo "项目未链接，正在初始化..."
    railway init
fi

echo "📋 项目状态:"
railway status
echo ""

# 部署（Railway 会自动选择服务）
echo "🚀 开始部署..."
railway up --detach

echo ""
echo "✅ 部署已启动！"
echo ""
echo "📝 查看日志: railway logs --follow"
echo "🌐 打开项目: railway open"
echo ""
echo "⚠️  如果部署失败，请在 Railway 网页界面："
echo "   1. 检查构建日志"
echo "   2. 设置环境变量（Variables 标签）"
echo "   3. 查看服务状态"

