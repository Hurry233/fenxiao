# 多用户AI知识库助手 - MVP系统

## 项目简介

这是一个多用户隔离的AI知识库助手MVP系统。每个注册用户在后端对应一个独立的FastGPT知识库（Dataset），用户上传的文件只存在于自己的知识库中，对话时只检索自己的知识库。

## 🌟 核心特性

- **用户隔离**: 每个用户拥有独立的FastGPT知识库
- **文件管理**: 支持PDF、DOC、DOCX、TXT文件上传
- **智能对话**: 基于用户知识库的AI对话
- **实时响应**: 支持流式打字机效果
- **现代UI**: 响应式设计，友好的用户体验

## 🏗️ 技术栈

### 后端
- **FastAPI** - 高性能Python Web框架
- **SQLite** - 轻量级数据库（存储用户和数据集关系）
- **JWT** - 用户认证
- **httpx** - HTTP客户端（调用FastGPT API）

### 前端
- **Vue 3** - 渐进式JavaScript框架
- **TailwindCSS** - 实用优先的CSS框架
- **Font Awesome** - 图标库
- **原生HTML** - 无需构建步骤

### 集成
- **FastGPT API** - AI知识库和对话服务

## 📦 项目结构

```
├── main.py              # FastAPI后端主程序
├── index.html           # Vue.js前端单页面
├── requirements.txt     # Python依赖包
├── .env.example        # 环境变量配置示例
├── .gitignore          # Git忽略文件
├── README.md           # 项目说明文档
└── users.db            # SQLite数据库（自动生成）
```

## 🚀 快速开始

### 前置要求

- Python 3.8+
- FastGPT账号和API密钥
- 现代Web浏览器

### 1. 环境配置

```bash
# 克隆项目（或使用现有文件）
cp .env.example .env
```

编辑 `.env` 文件，填入你的FastGPT API密钥：

```env
# FastGPT配置
FASTGPT_ADMIN_KEY=your_admin_api_key_here      # 用于创建知识库和上传文件
FASTGPT_CHAT_APP_KEY=your_chat_api_key_here    # 用于对话功能
FASTGPT_BASE_URL=https://fastgpt.aiown.top     # FastGPT服务地址
JWT_SECRET=your-secret-key-change-this         # JWT密钥（生产环境请修改）
```

如何获取FastGPT API密钥：
1. 登录FastGPT管理后台
2. 进入"API Keys"设置页面
3. 创建并复制Admin Key和App Key

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 运行应用

```bash
python main.py
```

或使用uvicorn直接运行：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 访问应用

打开浏览器，访问：
- **前端页面**: `http://localhost:8000` 或直接打开 `index.html`
- **API文档**: `http://localhost:8000/docs` (Swagger UI)
- **备用文档**: `http://localhost:8000/redoc`

## 📖 使用方法

### 用户注册

1. 打开应用首页
2. 点击"还没有账号？立即注册"
3. 输入用户名和密码
4. 系统自动创建对应的FastGPT知识库

### 用户登录

1. 输入已注册的用户名和密码
2. 登录后进入主界面
3. 查看个人知识库ID

### 文件上传

**方式一：点击上传**
1. 在侧边栏点击上传区域
2. 选择PDF、DOC、DOCX或TXT文件
3. 查看上传进度

**方式二：拖拽上传**
1. 将文件拖拽到上传区域
2. 等待自动上传完成
3. 查看上传结果

### AI对话

1. 在聊天输入框输入问题
2. 按回车或点击发送按钮
3. 实时查看AI回答（打字机效果）
4. 可以连续对话，AI会理解上下文

### 新建对话

- 点击"新建对话"按钮清空聊天记录
- 开始全新的对话会话

### 退出登录

- 点击侧边栏底部的"退出登录"
- 返回登录页面

## 🔧 API接口文档

### 认证相关

#### 用户注册
```http
POST /register
Content-Type: application/json

{
    "username": "testuser",
    "password": "yourpassword"
}
```

**响应：**
```json
{
    "success": true,
    "message": "Registration successful",
    "user_id": 1,
    "dataset_id": "fastgpt_dataset_123",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 用户登录
```http
POST /login
Content-Type: application/json

{
    "username": "testuser",
    "password": "yourpassword"
}
```

### 文件管理

#### 上传文件
```http
POST /upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary_file_data>
```

### 对话功能

#### 发送消息
```http
POST /chat
Authorization: Bearer <token>
Content-Type: application/json

{
    "messages": [
        {"role": "user", "content": "你好，请介绍一下知识库的内容"}
    ],
    "chatId": "optional_chat_id"
}
```

**响应：** 流式SSE响应

#### 获取当前用户信息
```http
GET /me
Authorization: Bearer <token>
```

## 🔒 安全说明

### 当前MVP版本的安全特性

- **密码存储**: 使用SHA-256哈希（MVP级别，生产环境建议使用bcrypt）
- **认证方式**: JWT令牌，有效期7天
- **CORS**: 允许所有来源（MVP级别，生产环境建议限制具体域名）
- **API密钥**: 通过环境变量管理，不提交到代码仓库

### 生产环境建议

1. **密码安全**: 使用bcrypt或Argon2进行密码哈希
2. **CORS**: 配置允许的域名白名单
3. **HTTPS**: 使用SSL/TLS加密通信
4. **JWT密钥**: 使用强随机密钥并定期更换
5. **API限流**: 添加请求频率限制
6. **日志监控**: 记录重要操作日志
7. **备份策略**: 定期备份SQLite数据库

## 🎯 核心功能实现

### 用户隔离机制

```python
# 每个用户拥有独立的dataset_id
{
    "user_id": 1,
    "username": "testuser",
    "fastgpt_dataset_id": "fastgpt_dataset_123"
}

# 对话时传递dataset_id作为变量
"variables": {
    "fastdataUid": "fastgpt_dataset_123"  # 确保只检索用户的知识库
}
```

### 流式响应实现

- 前端使用EventSource API接收SSE流
- 后端使用FastAPI的StreamingResponse
- 实时解析JSON片段并更新UI

### 文件上传流程

1. 用户选择文件
2. 前端验证文件类型
3. 使用XMLHttpRequest获取上传进度
4. 后端调用FastGPT文件上传API
5. 文件存储到用户专属的数据集

## 🛠️ 开发和调试

### 查看数据库

```bash
# SQLite命令行
sqlite3 users.db

# 查看用户表
SELECT * FROM users;
```

### 测试API

可以使用Swagger UI（`/docs`）或curl进行测试：

```bash
# 注册
 curl -X POST "http://localhost:8000/register" \\\n   -H "Content-Type: application/json" \\\n   -d '{"username": "test", "password": "123456"}'

# 登录
curl -X POST "http://localhost:8000/login" \\\n  -H "Content-Type: application/json" \\\n  -d '{"username": "test", "password": "123456"}'
```

### 前端调试

1. 打开浏览器开发者工具（F12）
2. 在Console查看日志
3. 在Network标签查看API请求

## 📋 系统要求

- **后端**: Python 3.8+, 内存512MB+, 磁盘空间100MB+
- **前端**: 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）
- **网络**: 能访问FastGPT API服务

## 🚀 扩展建议

### 功能扩展

1. **文件管理**:
   - 查看已上传文件列表
   - 删除知识库文件
   - 文件搜索和分类

2. **对话增强**:
   - 对话历史保存
   - 对话主题标签
   - 导出对话记录

3. **知识库管理**:
   - 多知识库支持
   - 知识库共享（团队功能）
   - 知识库分析和统计

### 技术优化

1. **后端优化**:
   - 使用PostgreSQL替代SQLite
   - 添加Redis缓存
   - 异步任务队列（Celery）

2. **前端优化**:
   - 使用Vite构建
   - 添加PWA支持
   - 代码分割和懒加载

3. **部署优化**:
   - Docker容器化
   - Nginx反向代理
   - 负载均衡

## 🐛 常见问题

### 1. 无法连接到FastGPT API

**问题**: `FastGPT API error` 或连接超时

**解决**:
- 检查 `.env` 中的 `FASTGPT_BASE_URL` 是否正确
- 验证网络是否能访问FastGPT服务
- 检查API密钥是否正确
- 确认FastGPT服务正在运行

### 2. 文件上传失败

**问题**: 上传进度卡死或失败

**解决**:
- 检查文件类型是否为支持格式（PDF、DOC、DOCX、TXT）
- 确认文件大小不超过FastGPT限制
- 查看浏览器Console和Network标签的错误信息
- 检查FastGPT的文件上传配置

### 3. 对话无响应

**问题**: AI不回复或回复很慢

**解决**:
- 检查网络连接
- 确认FastGPT服务正常运行
- 查看后端的日志输出
- 检查知识库是否正确创建和配置

### 4. 用户登录问题

**问题**: 无法登录或token失效

**解决**:
- 清除浏览器localStorage
- 重新登录获取新的token
- 检查JWT密钥配置
- 验证用户数据库记录

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License - 详见LICENSE文件

## 🆘 支持

如有问题，请：

1. 查看本README文档
2. 查看GitHub Issues
3. 提交新的Issue

## 🙏 致谢

- [FastGPT](https://fastgpt.in/) - 提供强大的AI知识库服务
- [FastAPI](https://fastapi.tiangolo.com/) - 现代化的Python Web框架
- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [TailwindCSS](https://tailwindcss.com/) - 实用优先的CSS框架

---

**Made with ❤️ for AI Knowledge Management**