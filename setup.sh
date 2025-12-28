#!/bin/bash

echo "🚀 多用户AI知识库助手 - 环境配置脚本"
echo "========================================"

# 检查Python版本
echo "📋 检查Python环境..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
if [ $? -ne 0 ]; then
    echo "❌ 未找到Python3，请先安装Python 3.8+"
    exit 1
fi
echo "✅ Python版本: $python_version"

# 检查pip
echo "📋 检查pip..."
if ! command -v pip &> /dev/null; then
    echo "❌ 未找到pip，请安装pip"
    exit 1
fi
echo "✅ pip已安装"

# 创建.env文件
echo ""
echo "📝 配置环境变量..."
if [ -f .env ]; then
    echo "⚠️  .env文件已存在，请手动编辑"
else
    cp .env.example .env
    echo "✅ 已创建.env文件，请编辑并填入FastGPT API密钥"
fi

# 安装依赖
echo ""
echo "📦 安装Python依赖包..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ 依赖包安装成功"
else
    echo "❌ 依赖包安装失败，请检查网络连接"
    exit 1
fi

# 检查端口
echo ""
echo "🔍 检查端口8000..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null; then
    echo "⚠️  端口8000已被占用，请关闭相关服务或修改端口"
    echo "   可以在main.py中修改: uvicorn.run(app, host='0.0.0.0', port=8001)"
else
    echo "✅ 端口8000可用"
fi

echo ""
echo "🎉 环境配置完成！"
echo "================================"
echo ""
echo "下一步："

if [ ! -f .env ] || ! grep -q "your_" .env; then
    echo "1. ✅ 环境变量: 已配置"
else
    echo "1. ⚠️  环境变量: 请在.env文件中填入FastGPT API密钥"
fi

echo "2. ✅ 依赖包: 已安装"
echo "3. 🚀 运行应用: python main.py"
echo ""
echo "访问地址："
echo "- 前端界面: http://localhost:8000"
echo "- API文档: http://localhost:8000/docs"
echo ""
echo "提示："
echo "- 首次访问请注册新用户"
echo "- 每个用户自动创建独立的FastGPT知识库"
echo "- 支持PDF、DOC、DOCX、TXT文件上传"
echo "- 在侧边栏查看上传进度和聊天"
echo ""