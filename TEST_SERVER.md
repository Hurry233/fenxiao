# 快速测试指南 - 修复根路径访问问题

## 问题原因

如果你访问 `http://localhost:8000/` 时仍然看到 JSON 响应，这是因为：

1. **FastAPI服务器需要重启** - 您可能还在运行旧版本的代码
2. **浏览器缓存** - 浏览器可能缓存了之前的 JSON 响应

## ✅ 解决方法

### 方法 1：快速重启 (推荐)

```bash
# 1. 停止当前运行的服务器 (Ctrl+C)

# 2. 重新启动服务器
python main.py

# 3. 在浏览器中强制刷新页面
#    Windows: Ctrl + F5
#    Mac: Cmd + Shift + R
#    或清除浏览器缓存后访问
```

### 方法 2：使用 uvicorn (推荐开发模式)

```bash
# 1. 安装uvicorn（如果还没有安装）
pip install uvicorn

# 2. 使用uvicorn运行，支持自动重载
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 3. 访问 http://localhost:8000
```

### 方法 3：验证文件和代码

在项目目录中执行以下命令检查：

```bash
# 检查index.html是否存在
ls -la index.html

# 应该显示类似：
# -rw-r--r-- 1 user user 30853 Dec 27 14:52 index.html

# 检查关键代码是否存在
grep -A 5 "serve_frontend" main.py

# 应该显示：
# @app.get("/")
# async def serve_frontend():
#     """Serve the frontend index.html file at root path"""
#     if os.path.exists("index.html"):
#         return FileResponse("index.html")
#     else:
#         return {"message": "Multi-User AI Knowledge Base API is running", "frontend": "index.html not found"}
```

## 🔍 验证步骤

完成上述重启后，访问 `http://localhost:8000/` 应该看到：

**预期结果（成功）：**
```
- 显示登录/注册页面
- 标题: "AI 知识库助手"
- 有用户名和密码输入框
- 有蓝色背景的登录按钮
```

**如果仍然看到：**
```json
{"message": "Multi-User AI Knowledge Base API is running"}
```

说明代码没有生效，请执行以下操作：

## 🚨 如果问题仍然存在

执行以下诊断步骤：

```bash
# 1. 查看当前main.py的最后50行（确认代码正确）
tail -50 main.py | grep -A 10 "@app.get"

# 2. 检查Python进程
ps aux | grep "python main.py"
# 确保没有重复运行的进程，有的话用kill命令停止

# 3. 检查端口占用
lsof -i :8000
# 如果有其他程序占用8000端口，请关闭或修改端口

# 4. 重新启动（确保使用正确的命令）
# 先停止所有相关进程
pkill -f "python.*main.py"
# 然后重新运行
python main.py
```

## 🔄 浏览器清除缓存步骤

不同的浏览器清除缓存方法：

### Chrome/Edge
1. 按 F12 打开开发者工具
2. 右键点击刷新按钮 → 选择"清空缓存并硬性重新加载"
3. 或者直接访问: `http://localhost:8000/?_t=` + 当前时间戳

### Firefox
1. 按 Ctrl+Shift+Delete (Windows) 或 Cmd+Shift+Delete (Mac)
2. 选择清除缓存
3. 按 Ctrl+F5 强制刷新

### Safari
1. 开发菜单 → 清空缓存
2. 或者 Option+Cmd+E

## 📞 如果以上方法都无效

请提供以下信息以便诊断：

```bash
# 在项目目录执行
echo "=== 环境信息 ==="
python3 --version
echo "=== main.py文件大小 ==="
ls -lh main.py
echo "=== index.html文件大小 ==="
ls -lh index.html
echo "=== 检查代码是否包含修复 ==="
grep "serve_frontend" main.py && echo "✅ 代码已更新" || echo "❌ 代码未找到"
```

## 🎯 预期效果

成功修复后，访问 `http://localhost:8000/` 应该显示：

![登录界面示例]
- 深蓝色标题: "AI 知识库助手"
- 副标题: "多用户隔离的智能知识管理系统"
- 用户名输入框和密码输入框
- 蓝色的"登录"或"注册"按钮
- 切换登录/注册模式的链接

## ✅ 确认成功

当你看到前端界面而不是JSON消息，说明修复成功！

接下来你可以：
1. 注册新用户（自动创建FastGPT知识库）
2. 登录系统
3. 上传PDF/DOC文件
4. 开始与AI对话

---

**重要提示**：每次修改 `main.py` 文件后，都必须重启服务器才能生效。