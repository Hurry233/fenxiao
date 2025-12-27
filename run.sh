#!/bin/bash

# 多用户AI知识库助手 - 自动化启动脚本
# 这个脚本会自动停止旧服务并启动新服务

echo "🚀 多用户AI知识库助手 - 自动启动脚本"
echo "========================================"
echo ""

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
PORT=8000
APP_NAME="AI知识库助手"

# 函数：打印带颜色的信息
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 检查是否在项目目录
if [ ! -f "main.py" ]; then
    print_error "未找到 main.py 文件，请在项目根目录运行此脚本"
    exit 1
fi

if [ ! -f "index.html" ]; then
    print_error "未找到 index.html 文件"
    exit 1
fi

print_success "找到所有必需文件"

# 检查Python环境
echo ""
echo "📋 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    print_error "未找到Python3，请安装Python 3.8+"
    exit 1
fi
print_success "Python版本: $(python3 --version)"

# 检查环境变量
echo ""
echo "📋 检查环境变量配置..."
if [ ! -f ".env" ]; then
    print_error "未找到 .env 文件，请先运行: cp .env.example .env"
    print_error "然后编辑 .env 文件填入FastGPT API密钥"
    exit 1
fi

# 检查是否使用了示例密钥
if grep -q "your_" .env; then
    print_warning ".env 文件中包含示例密钥，请先填入真实的FastGPT API密钥"
    print_warning "需要配置的密钥:"
    print_warning "  - FASTGPT_ADMIN_KEY"
    print_warning "  - FASTGPT_CHAT_APP_KEY"
    print_warning "  - JWT_SECRET (建议修改)"
    echo ""
    read -p "是否继续启动？(y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_success ".env 文件已配置"
fi

# 检查依赖
echo ""
echo "📦 检查Python依赖..."
if ! python3 -c "import fastapi" &> /dev/null; then
    print_warning "缺少依赖包，正在安装..."
    pip3 install -r requirements.txt
    if [ $? -eq 0 ]; then
        print_success "依赖包安装完成"
    else
        print_error "依赖包安装失败"
        exit 1
    fi
else
    print_success "依赖包已安装"
fi

# 检查端口占用
echo ""
echo "🔍 检查端口 $PORT..."
PID=$(lsof -ti :$PORT)
if [ ! -z "$PID" ]; then
    print_warning "端口 $PORT 被占用 (PID: $PID)"
    echo ""
    read -p "是否停止占用端口的进程？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PID
        sleep 2
        print_success "已停止旧进程"
    else
        print_error "请手动停止占用端口 $PORT 的进程后重试"
        exit 1
    fi
else
    print_success "端口 $PORT 可用"
fi

# 测试配置文件中的API密钥
echo ""
echo "🔑 测试FastGPT连接配置..."
source .env

if [ "$FASTGPT_ADMIN_KEY" = "your_fastgpt_admin_key_here" ] || [ "$FASTGPT_CHAT_APP_KEY" = "your_fastgpt_chat_app_key_here" ]; then
    print_warning "API密钥未配置，请先配置真实的FastGPT API密钥"
    print_warning "即使使用示例密钥启动，系统也无法正常工作"
else
    print_success "API密钥已配置"
fi

# 启动服务器
echo ""
echo "🚀 启动 $APP_NAME 服务器..."
echo "================================"

# 启动Python服务器
python3 main.py &
SERVER_PID=$!

# 等待服务器启动
echo "等待服务器启动..."
sleep 3

# 检查服务器是否成功启动
if ps -p $SERVER_PID > /dev/null; then
    print_success "服务器启动成功！"
    
    # 测试根路径
    echo ""
    echo "🔍 测试根路径响应..."
    RESPONSE=$(curl -s http://localhost:$PORT/)
    
    if echo "$RESPONSE" | grep -q "<!DOCTYPE html>"; then
        print_success "✨ 前端页面正常加载！"
    elif echo "$RESPONSE" | grep -q "Multi-User AI Knowledge Base API"; then
        print_warning "返回了JSON响应，请清除浏览器缓存后重试"
        print_warning "访问: http://localhost:$PORT"
    else
        print_error "无法获取根路径响应"
    fi
    
    echo ""
    echo "================================"
    print_success "$APP_NAME 已启动并运行！"
    echo ""
    echo "📍 访问地址:"
    echo "   - 前端界面: http://localhost:$PORT"
    echo "   - API文档:  http://localhost:$PORT/docs"
    echo ""
    echo "📝 使用步骤:"
    echo "   1. 打开浏览器访问 http://localhost:$PORT"
    echo "   2. 注册新用户（自动创建FastGPT知识库）"
    echo "   3. 登录系统"
    echo "   4. 上传PDF/DOC文件到知识库"
    echo "   5. 开始AI对话"
    echo ""
    echo "🛑 停止服务器: Ctrl+C"
    echo ""
    
    # 等待服务器运行
    wait $SERVER_PID
else
    print_error "服务器启动失败"
    
    # 显示错误日志
    echo ""
    echo "错误信息："
    tail -20 main.py.log 2>/dev/null || echo "无日志文件"
    
    exit 1
fi

trap "kill $SERVER_PID" EXIT