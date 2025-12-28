#!/bin/bash

# 多用户AI知识库助手 - 一键部署和启动脚本
# 这个脚本会：1) 验证环境 2) 启动服务 3) 验证系统

set -e  # 遇到错误立即退出

echo "🚀 多用户AI知识库助手 - 一键部署和启动"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
PORT=8000
PROJECT_DIR="$(pwd)"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/app.log"
PID_FILE="$PROJECT_DIR/app.pid"

# 日志函数
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 创建日志目录
mkdir -p "$LOG_DIR"

# 步骤1: 环境验证
echo -e "${BLUE}步骤1: 环境验证${NC}"
echo "================================"

# 检查Python
if ! command -v python3 &> /dev/null; then
    log_error "Python3未安装"
    exit 1
fi
log_success "Python3版本: $(python3 --version)"

# 检查pip
if ! command -v pip &> /dev/null; then
    log_error "pip未安装"
    exit 1
fi
log_success "pip已安装"

# 检查.env文件
if [ ! -f .env ]; then
    log_warning ".env文件不存在，创建默认文件"
    cp .env.example .env
    log_info "请在.env文件中配置FastGPT API密钥"
else
    # 检查是否已配置API密钥
    if grep -q "your_fastgpt" .env; then
        log_warning ".env文件包含示例API密钥，需要替换为真实密钥"
        log_info "请编辑.env文件并填入真实的FastGPT API密钥"
    else
        log_success ".env文件已配置"
    fi
fi

# 安装依赖
log_info "安装Python依赖..."
if pip install -q -r requirements.txt; then
    log_success "依赖安装完成"
else
    log_error "依赖安装失败"
    exit 1
fi

# 步骤2: 代码验证
echo ""
echo -e "${BLUE}步骤2: 代码验证${NC}"
echo "================================"

# 验证main.py
if [ -f "main.py" ]; then
    log_success "main.py存在 ($(wc -l < main.py) 行)"
else
    log_error "main.py不存在"
    exit 1
fi

# 验证index.html
if [ -f "index.html" ]; then
    log_success "index.html存在 ($(wc -l < index.html) 行)"
    
    # 检查HTML关键元素
    if grep -q 'id="app"' index.html; then
        log_success "✓ #app元素存在"
    else
        log_error "✗ #app元素不存在"
    fi
    
    if grep -q "createApp" index.html; then
        log_success "✓ Vue createApp调用存在"
    else
        log_error "✗ Vue createApp调用不存在"
    fi
    
    if grep -q "mount('#app')" index.html; then
        log_success "✓ Vue mount调用存在"
    else
        log_error "✗ Vue mount调用不存在"
    fi
else
    log_error "index.html不存在"
    exit 1
fi

# 步骤3: 端口检查
echo ""
echo -e "${BLUE}步骤3: 端口检查${NC}"
echo "================================"

if lsof -Pi :$PORT -sTCP:LISTEN &> /dev/null; then
    PID=$(lsof -ti :$PORT)
    log_warning "端口 $PORT 已被占用 (PID: $PID)"
    
    # 询问用户是否终止进程
    read -p "是否终止该进程? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PID
        sleep 2
        log_success "已终止占用端口的进程"
    else
        log_error "请手动终止端口 $PORT 的进程后重试"
        exit 1
    fi
else
    log_success "端口 $PORT 可用"
fi

# 步骤4: 启动应用
echo ""
echo -e "${BLUE}步骤4: 启动应用${NC}"
echo "================================"

log_info "启动FastAPI服务器..."

# 启动后台进程
nohup python3 main.py > "$LOG_FILE" 2>&1 &
APP_PID=$!
echo $APP_PID > "$PID_FILE"

log_success "应用已启动 (PID: $APP_PID)"
log_info "日志文件: $LOG_FILE"

# 等待服务器启动
echo ""
echo -n "等待服务器启动"
for i in {1..10}; do
    echo -n "."
    sleep 0.5
done
echo ""

# 步骤5: 验证应用
echo ""
echo -e "${BLUE}步骤5: 验证应用${NC}"
echo "================================"

# 检查进程是否还在运行
if ps -p $APP_PID > /dev/null; then
    log_success "应用进程运行中"
else
    log_error "应用进程已退出"
    log_info "查看日志: tail -f $LOG_FILE"
    exit 1
fi

# 测试根路径
echo "测试根路径..."
if curl -s http://localhost:$PORT/ > /dev/null; then
    log_success "✓ 根路径可访问"
    
    # 检查返回内容类型
    CONTENT_TYPE=$(curl -s -I http://localhost:$PORT/ | grep -i "content-type" | cut -d' ' -f2)
    echo "  内容类型: $CONTENT_TYPE"
    
    if echo "$CONTENT_TYPE" | grep -q "html"; then
        log_success "✓ 返回HTML内容（Vue渲染成功）"
    else
        log_warning "⚠ 返回非HTML内容（JSON），可能是API响应"
    fi
else
    log_error "✗ 根路径无法访问"
    log_info "查看日志: tail -f $LOG_FILE"
    exit 1
fi

# 步骤6: 显示访问信息
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ 应用启动成功！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${CYAN}访问地址:${NC}"
echo -e "  ${BLUE}前端界面:${NC} http://localhost:$PORT"
echo -e "  ${BLUE}API文档:${NC}  http://localhost:$PORT/docs"
echo ""
echo -e "${CYAN}管理命令:${NC}"
echo -e "  ${YELLOW}查看日志:${NC} tail -f $LOG_FILE"
echo -e "  ${YELLOW}停止服务:${NC} kill $APP_PID"
echo -e "  ${YELLOW}重启服务:${NC} ./deploy.sh"
echo ""

echo -e "${MAGENTA}首次使用提示:${NC}"
echo -e "1. 打开浏览器访问 http://localhost:$PORT"
echo -e "2. 注册新用户（自动创建FastGPT知识库）"
echo -e "3. 登录系统"
echo -e "4. 上传PDF/DOC文件"
echo -e "5. 开始AI对话"
echo ""

echo -e "${GREEN}享受您的AI知识库助手！${NC}"
echo ""

# 在后台运行，但保持脚本运行
log_info "应用正在运行... Press Ctrl+C to stop"

# 捕获Ctrl+C来清理
trap "echo ''; echo '正在停止服务...'; kill $APP_PID 2>/dev/null; rm -f $PID_FILE; exit 0" INT

# 保持脚本运行，显示日志
tail -f "$LOG_FILE"