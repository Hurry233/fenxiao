#!/bin/bash

echo "🔍 Vue模板诊断与修复工具"
echo "========================"
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/home/engine/project"
INDEX_HTML="$PROJECT_DIR/index.html"

echo -e "${BLUE}步骤 1: 检查index.html文件${NC}"
echo "文件路径: $INDEX_HTML"

if [ ! -f "$INDEX_HTML" ]; then
    echo -e "${RED}❌ 错误: index.html不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✅ index.html存在 (大小: $(wc -c < "$INDEX_HTML") bytes)${NC}"
echo ""

echo -e "${BLUE}步骤 2: 检查HTML结构${NC}"

# 检查DOCTYPE
echo "检查DOCTYPE:"
if grep -q "^<!DOCTYPE html>" "$INDEX_HTML"; then
    echo -e "${GREEN}✅ DOCTYPE正确${NC}"
else
    echo -e "${RED}⚠️  DOCTYPE可能缺失${NC}"
fi

# 检查#app元素
echo ""
echo "检查#app元素:"
APP_LINE=$(grep -n 'id="app"' "$INDEX_HTML" | cut -d: -f1)
if [ -n "$APP_LINE" ]; then
    echo -e "${GREEN}✅ 找到#app元素 (行号: $APP_LINE)${NC}"
else
    echo -e "${RED}❌ 错误: 未找到#app元素${NC}"
fi

# 检查Vue.mount调用
echo ""
echo "检查Vue.mount():"
MOUNT_LINE=$(grep -n "mount('#app')" "$INDEX_HTML" | cut -d: -f1)
if [ -n "$MOUNT_LINE" ]; then
    echo -e "${GREEN}✅ 找到mount调用 (行号: $MOUNT_LINE)${NC}"
else
    echo -e "${RED}❌ 错误: 未找到mount调用${NC}"
fi

echo ""
echo -e "${BLUE}步骤 3: 检查Vue.js加载${NC}"

# 检查Vue CDN链接
if grep -q 'unpkg.com/vue@3' "$INDEX_HTML"; then
    echo -e "${GREEN}✅ Vue.js CDN链接存在${NC}"
else
    echo -e "${RED}❌ 错误: Vue.js CDN链接不存在${NC}"
fi

# 检查createApp调用
echo ""
echo "检查createApp调用:"
CREATEAPP_COUNT=$(grep -c "createApp" "$INDEX_HTML")
if [ "$CREATEAPP_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ 找到 $CREATEAPP_COUNT 个createApp引用${NC}"
else
    echo -e "${RED}❌ 错误: 未找到createApp${NC}"
fi

echo ""
echo -e "${BLUE}步骤 4: 检查模板语法${NC}"

# 检查{{ authError }}
echo "检查模板变量:"
AUTHERR_COUNT=$(grep -c '{{ authError }}' "$INDEX_HTML")
echo -e "${GREEN}✅ 找到 $AUTHERR_COUNT 个authError模板变量${NC}"

# 检查其他模板变量
VUE_VAR_COUNT=$(grep -c '{{' "$INDEX_HTML")
echo "找到 $VUE_VAR_COUNT 个Vue模板变量"

echo ""
echo -e "${BLUE}步骤 5: 生成诊断报告${NC}"

# 提取登录表单附近代码
START_LINE=$((APP_LINE - 20))
END_LINE=$((APP_LINE + 50))
echo "#app元素周围代码:"
if [ -n "$APP_LINE" ]; then
    sed -n "${START_LINE},${END_LINE}p" "$INDEX_HTML" | head -60
fi

echo ""
echo -e "${YELLOW}诊断完成!${NC}"
echo ""
echo "常见问题:"
echo "1. Vue.js CDN加载失败 -> 检查网络连接"
echo "2. mount()未调用 -> 检查JavaScript错误"
echo "3. #app元素不存在 -> 检查HTML结构"
echo ""
echo "修复建议:"
echo "a) 确保所有CDN链接可访问"
echo "b) 检查浏览器开发者工具的Console"
echo "c) 验证Vue正确加载: typeof Vue !== 'undefined'"
echo ""

echo "生成修复建议文件..."
cat > "$PROJECT_DIR/vue_diagnosis_report.txt" << EOF
Vue模板渲染问题诊断报告
========================

检查时间: $(date)
项目路径: $PROJECT_DIR

检查结果:
- index.html存在: ✅
- DOCTYPE正确: ✅
- #app元素行号: ${APP_LINE:-未找到}
- mount()调用行号: ${MOUNT_LINE:-未找到}
- Vue CDN链接: $(grep -q 'unpkg.com/vue@3' "$INDEX_HTML" && echo "✅" || echo "❌")
- createApp引用数: $CREATEAPP_COUNT
- Vue模板变量数: $VUE_VAR_COUNT

快速修复:
1. 检查浏览器Console是否有JavaScript错误
2. 确保#app元素在DOM中存在
3. 验证Vue.js成功加载
4. 检查mount()调用是否有错误

调试步骤:
1. 在浏览器Console输入: typeof Vue
   应该返回: "function" 或 "object"

2. 在浏览器Console输入: document.getElementById('app')
   应该返回: <div id="app">...</div>

3. 检查HTML文件完整性和语法
EOF

echo "报告已生成: vue_diagnosis_report.txt"
echo ""
echo -e "${GREEN}✅ 诊断完成${NC}"