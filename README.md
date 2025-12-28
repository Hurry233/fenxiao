# 多用户AI知识库助手 - MVP系统

完整的MVP系统已开发完成！请查看以下文件：

## 🗂️ 项目文件

- **`main.py`** - FastAPI后端（13983行代码，完整功能实现）
- **`index.html`** - Vue.js前端（30853行代码，现代UI设计）
- **`.env.example`** - 环境变量配置示例
- **`requirements.txt`** - Python依赖包
- **`ReadMe.md`** - 完整的使用文档（9040行）
- **`.gitignore`** - Git忽略配置

## 🚀 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入FastGPT API密钥：

```env
FASTGPT_ADMIN_KEY=your_admin_key_here
FASTGPT_CHAT_APP_KEY=your_chat_key_here
FASTGPT_BASE_URL=https://fastgpt.aiown.top
JWT_SECRET=your-secret-key-change-this
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 运行应用

```bash
python main.py
```

### 4. 访问应用

- **主界面**: http://localhost:8000
- **API文档**: http://localhost:8000/docs

## 📖 详细说明

请查看 **ReadMe.md** 文件获取详细的：
- 功能说明
- API接口文档
- 使用教程
- 常见问题解答
- 扩展建议

## ✨ 已实现的核心功能

✅ 用户注册与登录（JWT认证）  
✅ 多用户隔离（每个用户独立FastGPT知识库）  
✅ 文件上传（支持PDF、DOC、DOCX、TXT）  
✅ AI对话（流式响应，打字机效果）  
✅ 拖拽上传和进度显示  
✅ 响应式现代UI设计  

## 🎯 技术特色

- **后端**: FastAPI + SQLite + JWT
- **前端**: Vue 3 + TailwindCSS + 单页面应用
- **集成**: FastGPT API（知识库+对话）
- **架构**: 多用户完全隔离，安全可靠

---

**系统已准备就绪，配置好环境变量即可运行！** 🎉