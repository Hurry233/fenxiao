// AI知识库助手 - 核心JavaScript
// 使用纯原生JavaScript，避免框架复杂性

// ==========================================
// 全局配置
// ==========================================

const API_BASE_URL = 'http://localhost:8000';
const APP = {
    currentUser: null,
    token: null,
    messages: [],
    chatSessions: [],
    uploadedFiles: [
        // 示例数据
        { id: 1, name: '示例文档.pdf', size: 1024000, uploadTime: '2024-01-01 10:00', fastgpt_file_id: null },
        { id: 2, name: '会议记录.docx', size: 512000, uploadTime: '2024-01-02 14:30', fastgpt_file_id: null }
    ]
};

// ==========================================
// 工具函数
// ==========================================

const Utils = {
    // 显示加载指示器
    showLoading(text = '加载中...') {
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-overlay').classList.remove('hidden');
    },
    
    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    },
    
    // 显示错误消息
    showError(elementId, message) {
        const errorDiv = document.getElementById(elementId);
        const messageSpan = errorDiv.querySelector('span');
        if (messageSpan) {
            messageSpan.textContent = message;
        }
        errorDiv.classList.remove('hidden');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    },
    
    hideError(elementId) {
        document.getElementById(elementId).classList.add('hidden');
    },
    
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // 获取文件图标
    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf': return 'fas fa-file-pdf text-red-500';
            case 'doc':
            case 'docx': return 'fas fa-file-word text-blue-600';
            case 'txt': return 'fas fa-file-alt text-gray-600';
            default: return 'fas fa-file text-gray-400';
        }
    },
    
    // 生成随机ID
    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    },
    
    // 显示成功消息
    showSuccess(message, duration = 3000) {
        const successDiv = document.getElementById('upload-success');
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
        
        setTimeout(() => {
            successDiv.classList.add('hidden');
        }, duration);
    }
};

// ==========================================
// Markdown渲染器
// ==========================================

const MarkdownRenderer = {
    init() {
        // 配置marked
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
        
        // 初始化Clipboard.js
        new ClipboardJS('.copy-btn');
    },
    
    render(markdown) {
        return marked.parse(markdown);
    },
    
    highlightCode(element) {
        element.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
            
            // 添加复制按钮
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = '复制';
            copyBtn.setAttribute('data-clipboard-text', block.textContent);
            
            const pre = block.parentElement;
            pre.style.position = 'relative';
            pre.appendChild(copyBtn);
            
            // 复制成功反馈
            copyBtn.addEventListener('click', () => {
                copyBtn.textContent = '已复制!';
                copyBtn.classList.add('copy-success');
                setTimeout(() => {
                    copyBtn.textContent = '复制';
                    copyBtn.classList.remove('copy-success');
                }, 2000);
            });
        });
    }
};

// ==========================================
// API客户端
// ==========================================

const API = {
    token: localStorage.getItem('token'),
    
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    },
    
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    },
    
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {},
            ...options
        };
        
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        if (options.body && !(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || '请求失败');
            }
            
            return { success: true, data };
        } catch (error) {
            console.error(`API请求失败 ${endpoint}:`, error);
            return { success: false, error: error.message };
        }
    },
    
    // 用户注册
    async register(username, password) {
        return this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    
    // 用户登录
    async login(username, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    
    // 获取用户信息
    async getUserInfo() {
        return this.request('/me');
    },
    
    // 上传文件
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        return this.request('/upload', {
            method: 'POST',
            body: formData
        });
    },
    
    // 发送聊天消息
    async sendChat(messages) {
        return this.request('/chat', {
            method: 'POST',
            body: JSON.stringify({ messages })
        });
    },
    
    // 删除文件
    async deleteFile(fileId, collectionId) {
        return this.request(`/files/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ collectionIds: [collectionId] })
        });
    }
};

// ==========================================
// 认证管理器
// ==========================================

const AuthManager = {
    init() {
        this.checkAuth();
        this.bindEvents();
    },
    
    checkAuth() {
        const token = localStorage.getItem('token');
        if (token) {
            API.setToken(token);
            this.loadUser();
        } else {
            this.showAuthPage();
        }
    },
    
    async loadUser() {
        Utils.showLoading('加载用户信息...');
        const result = await API.getUserInfo();
        Utils.hideLoading();
        
        if (result.success) {
            APP.currentUser = result.data.user;
            this.showAppPage();
            this.updateUserInfo();
        } else {
            this.showAuthPage();
        }
    },
    
    showAuthPage() {
        document.getElementById('auth-page').classList.remove('hidden');
        document.getElementById('app-page').classList.add('hidden');
        this.renderAuthForm();
    },
    
    showAppPage() {
        document.getElementById('auth-page').classList.add('hidden');
        document.getElementById('app-page').classList.remove('hidden');
        ChatManager.loadChatHistory();
        FileManager.loadFiles();
    },
    
    renderAuthForm(isLogin = true) {
        const container = document.getElementById('auth-form-container');
        const toggleBtn = document.getElementById('toggle-auth-mode');
        
        container.innerHTML = `
            <form id="auth-form" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                    <div class="relative">
                        <i class="fas fa-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="username" name="username" required
                               class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                               placeholder="请输入用户名">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="password" id="password" name="password" required
                               class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                               placeholder="请输入密码">
                    </div>
                </div>
                <button type="submit" id="auth-submit"
                        class="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                    ${isLogin ? '登录' : '注册'}
                </button>
            </form>
        `;
        
        toggleBtn.textContent = isLogin ? '还没有账号？立即注册' : '已有账号？立即登录';
        toggleBtn.onclick = () => this.renderAuthForm(!isLogin);
        
        // 绑定表单提交
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuth(isLogin);
        });
    },
    
    renderAuthForm(isLogin = true) {
        const container = document.getElementById('auth-form-container');
        const toggleBtn = document.getElementById('toggle-auth-mode');
        
        container.innerHTML = `
            <form id="auth-form" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                    <div class="relative">
                        <i class="fas fa-user absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="username" name="username" required
                               class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                               placeholder="请输入用户名">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
                    <div class="relative">
                        <i class="fas fa-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="password" id="password" name="password" required
                               class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                               placeholder="请输入密码">
                    </div>
                </div>
                <button type="submit" id="auth-submit"
                        class="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                    ${isLogin ? '登录' : '注册'}
                </button>
            </form>
        `;
        
        toggleBtn.textContent = isLogin ? '还没有账号？立即注册' : '已有账号？立即登录';
        toggleBtn.onclick = () => this.renderAuthForm(!isLogin);
        
        // 绑定表单提交
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAuth(isLogin);
        });
    },
    
    async handleAuth(isLogin) {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            Utils.showError('auth-error', '请填写用户名和密码');
            return;
        }
        
        Utils.showLoading(isLogin ? '登录中...' : '注册中...');
        Utils.hideError('auth-error');
        
        const result = isLogin ? await API.login(username, password) : await API.register(username, password);
        Utils.hideLoading();
        
        if (result.success) {
            API.setToken(result.data.token);
            APP.currentUser = {
                id: result.data.user_id,
                username: username,
                dataset_id: result.data.dataset_id
            };
            this.showAppPage();
            this.updateUserInfo();
            ChatManager.init();
            FileManager.init();
        } else {
            Utils.showError('auth-error', result.error);
        }
    },
    
    updateUserInfo() {
        if (!APP.currentUser) return;
        
        document.getElementById('user-username').textContent = APP.currentUser.username;
        document.getElementById('user-dataset').textContent = `知识库: ${APP.currentUser.dataset_id}`;
        document.getElementById('sidebar-username').textContent = APP.currentUser.username;
        document.getElementById('current-kb').textContent = `${APP.currentUser.username}_KB`;
    },
    
    logout() {
        if (confirm('确定要退出登录吗？')) {
            API.clearToken();
            APP.currentUser = null;
            APP.token = null;
            APP.messages = [];
            APP.chatSessions = [];
            this.showAuthPage();
        }
    },
    
    bindEvents() {
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    }
};

// ==========================================
// 聊天管理器
// ==========================================

const ChatManager = {
    currentChatId: null,
    
    init() {
        this.loadChatHistory();
        this.bindEvents();
        this.renderMessages();
    },
    
    bindEvents() {
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('new-chat-btn').addEventListener('click', () => this.newChat());
    },
    
    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message) return;
        if (!APP.currentUser) {
            Utils.showError('auth-error', '请先登录');
            return;
        }
        
        // 添加到消息列表
        this.addMessage(message, 'user');
        input.value = '';
        
        // 添加AI占位消息
        const aiMessageId = Utils.generateId();
        this.addMessage('', 'assistant', aiMessageId, true);
        
        // 禁用发送按钮
        document.getElementById('send-btn').disabled = true;
        
        // 发送请求
        Utils.showLoading('AI正在思考...');
        const result = await API.sendChat([{ role: 'user', content: message }]);
        Utils.hideLoading();
        
        // 启用发送按钮
        document.getElementById('send-btn').disabled = false;
        
        if (result.success) {
            this.streamResponse(aiMessageId, result.data);
        } else {
            this.updateMessage(aiMessageId, '抱歉，发生了错误。请稍后重试。', false);
        }
    },
    
    async streamResponse(messageId, responseData) {
        // 简化的流式响应（实际项目中应使用fetch的流式API）
        setTimeout(() => {
            const aiResponse = "这是AI的回复。实际项目中这里会处理流式响应。";
            this.updateMessage(messageId, aiResponse, false);
        }, 1000);
    },
    
    addMessage(content, role, messageId = null, isTyping = false) {
        const messagesContainer = document.getElementById('messages');
        const emptyChat = document.getElementById('empty-chat');
        
        if (emptyChat) {
            emptyChat.classList.add('hidden');
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-bubble fade-in';
        messageDiv.dataset.messageId = messageId || Utils.generateId();
        messageDiv.dataset.role = role;
        
        const bgColor = role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-sm';
        const iconClass = role === 'user' ? 'fas fa-user text-indigo-300' : 'fas fa-robot text-indigo-600';
        
        messageDiv.innerHTML = `
            <div class="flex justify-${role === 'user' ? 'end' : 'start'}">
                <div class="max-w-3xl px-4 py-3 rounded-lg ${bgColor}">
                    <div class="flex items-start space-x-2">
                        <i class="${iconClass} mt-1"></i>
                        <div class="markdown-content">
                            <div class="whitespace-pre-wrap">${isTyping ? '<i class="fas fa-spinner fa-spin mr-1"></i>' : ChatManager.renderMarkdown(content)}</div>
                        </div>
                    </div>
                    ${isTyping ? '<p class="text-xs mt-2 opacity-70"><i class="fas fa-spinner fa-spin mr-1"></i>AI 正在思考...</p>' : ''}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        
        // 滚动到底部
        const chatContainer = document.getElementById('chat-container');
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
        // 如果是AI消息，高亮代码
        if (role === 'assistant' && !isTyping) {
            MarkdownRenderer.highlightCode(messageDiv);
        }
        
        return messageDiv.dataset.messageId;
    },
    
    updateMessage(messageId, content, isTyping = false) {
        const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageDiv) return;
        
        const contentDiv = messageDiv.querySelector('.markdown-content > div');
        if (contentDiv) {
            contentDiv.innerHTML = isTyping ? '<i class="fas fa-spinner fa-spin mr-1"></i> AI 正在思考...' : ChatManager.renderMarkdown(content);
        }
        
        if (!isTyping) {
            const typingIndicator = messageDiv.querySelector('.text-xs.mt-2');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            MarkdownRenderer.highlightCode(messageDiv);
        }
    },
    
    renderMarkdown(markdown) {
        if (!markdown) return '';
        return marked.parse(markdown);
    },
    
    newChat() {
        if (APP.messages.length > 0) {
            const title = APP.messages[0].content.substring(0, 30) + '...';
            APP.chatSessions.unshift({
                id: Utils.generateId(),
                title: title,
                timestamp: new Date().toLocaleString(),
                messages: [...APP.messages]
            });
            this.saveChatHistory();
        }
        
        APP.messages = [];
        this.renderMessages();
    },
    
    saveChatHistory() {
        if (!APP.currentUser) return;
        const key = `chat_history_${APP.currentUser.id}`;
        localStorage.setItem(key, JSON.stringify(APP.chatSessions));
    },
    
    loadChatHistory() {
        if (!APP.currentUser) {
            APP.chatSessions = [];
            return;
        }
        
        const key = `chat_history_${APP.currentUser.id}`;
        const saved = localStorage.getItem(key);
        APP.chatSessions = saved ? JSON.parse(saved) : [];
        this.renderChatSessions();
    },
    
    renderChatSessions() {
        const container = document.getElementById('chat-sessions');
        container.innerHTML = '';
        
        if (APP.chatSessions.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-gray-500 text-sm"><i class="fas fa-comments text-gray-300 mb-2"></i><p>暂无对话历史</p></div>';
            return;
        }
        
        APP.chatSessions.forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.className = 'group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100';
            sessionDiv.onclick = () => this.loadSession(session.id);
            
            sessionDiv.innerHTML = `
                <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-700 truncate">${session.title}</p>
                    <p class="text-xs text-gray-500">${session.timestamp}</p>
                </div>
                <button onclick="event.stopPropagation(); ChatManager.deleteSession('${session.id}')" 
                        class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            `;
            
            container.appendChild(sessionDiv);
        });
    },
    
    loadSession(sessionId) {
        const session = APP.chatSessions.find(s => s.id === sessionId);
        if (!session) return;
        
        APP.messages = [...session.messages];
        this.renderMessages();
        
        const chatContainer = document.getElementById('chat-container');
        setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
    },
    
    deleteSession(sessionId) {
        if (confirm('确定要删除这个对话吗？')) {
            APP.chatSessions = APP.chatSessions.filter(s => s.id !== sessionId);
            this.saveChatHistory();
            this.renderChatSessions();
        }
    },
    
    renderMessages() {
        const container = document.getElementById('messages');
        container.innerHTML = '';
        
        if (APP.messages.length === 0) {
            document.getElementById('empty-chat').classList.remove('hidden');
            return;
        }
        
        document.getElementById('empty-chat').classList.add('hidden');
        
        APP.messages.forEach(message => {
            this.addMessage(message.content, message.role, message.id);
        });
    }
};

// ==========================================
// 文件管理器
// ==========================================

const FileManager = {
    init() {
        this.bindEvents();
        this.loadFiles();
    },
    
    bindEvents() {
        // 文件输入变化
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        // 拖拽上传
        const uploadArea = document.getElementById('upload-area');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                this.uploadFile(e.dataTransfer.files[0]);
            }
        });
    },
    
    async loadFiles() {
        // 在实际应用中，这里应该从后端API加载文件列表
        // 现在使用内存中的示例数据
        this.renderFiles();
    },
    
    renderFiles() {
        const container = document.getElementById('file-list');
        container.innerHTML = '';
        
        if (APP.uploadedFiles.length === 0) {
            container.innerHTML = '<div class="text-center py-3 text-gray-500 text-sm"><i class="fas fa-file text-gray-300 mb-1"></i><p>暂无上传文件</p></div>';
            return;
        }
        
        APP.uploadedFiles.forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'group flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100';
            
            fileDiv.innerHTML = `
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                    <i class="${Utils.getFileIcon(file.name)} text-sm"></i>
                    <span class="text-xs text-gray-700 truncate">${file.name}</span>
                </div>
                <div class="flex items-center space-x-1">
                    <span class="text-xs text-gray-500">${Utils.formatFileSize(file.size)}</span>
                    <button onclick="FileManager.deleteFile('${file.id}')" 
                            class="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="删除文件">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(fileDiv);
        });
    },
    
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    },
    
    async uploadFile(file) {
        if (!APP.currentUser) {
            Utils.showError('auth-error', '请先登录');
            return;
        }
        
        // 验证文件类型
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = file.name.toLowerCase();
        
        const isValidType = allowedTypes.some(type => fileName.endsWith(type));
        
        if (!isValidType) {
            Utils.showError('upload-error', '不支持的文件类型，请上传 PDF, DOC, DOCX 或 TXT 文件');
            return;
        }
        
        // 显示上传进度
        this.showUploadProgress();
        
        Utils.showLoading('上传文件中...');
        const result = await API.uploadFile(file);
        Utils.hideLoading();
        
        if (result.success) {
            // 添加到文件列表
            APP.uploadedFiles.unshift({
                id: Utils.generateId(),
                name: file.name,
                size: file.size,
                uploadTime: new Date().toLocaleString(),
                fastgpt_file_id: result.data.fastgpt_file_id || null
            });
            
            this.renderFiles();
            Utils.showSuccess(`文件 "${file.name}" 上传成功！`);
            this.hideUploadProgress();
        } else {
            Utils.showError('upload-error', result.error);
            this.hideUploadProgress();
        }
    },
    
    async deleteFile(fileId) {
        if (!confirm('确定要删除这个文件吗？')) return;
        
        const file = APP.uploadedFiles.find(f => f.id === fileId);
        if (!file) return;
        
        if (!file.fastgpt_file_id) {
            // 仅从本地列表中移除
            APP.uploadedFiles = APP.uploadedFiles.filter(f => f.id !== fileId);
            this.renderFiles();
            Utils.showSuccess('文件删除成功');
            return;
        }
        
        Utils.showLoading('删除文件中...');
        const result = await API.deleteFile(fileId, file.fastgpt_file_id);
        Utils.hideLoading();
        
        if (result.success) {
            APP.uploadedFiles = APP.uploadedFiles.filter(f => f.id !== fileId);
            this.renderFiles();
            Utils.showSuccess('文件删除成功');
        } else {
            Utils.showError('upload-error', result.error);
        }
    },
    
    showUploadProgress() {
        document.getElementById('upload-progress-container').classList.remove('hidden');
        document.getElementById('upload-progress-bar').style.width = '0%';
        document.getElementById('upload-status').textContent = '准备上传...';
    },
    
    updateUploadProgress(percent) {
        document.getElementById('upload-progress-bar').style.width = percent + '%';
        document.getElementById('upload-status').textContent = `上传中... ${Math.round(percent)}%`;
    },
    
    hideUploadProgress() {
        document.getElementById('upload-progress-container').classList.add('hidden');
        document.getElementById('upload-progress-bar').style.width = '0%';
    }
};

// ==========================================
// 消息卡片组件
// ==========================================

const MessageCard = {
    create(content, role, messageId = null, isTyping = false) {
        const div = document.createElement('div');
        div.className = 'message-bubble fade-in';
        div.dataset.messageId = messageId || Utils.generateId();
        div.dataset.role = role;
        
        const bgColor = role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 shadow-sm';
        const iconClass = role === 'user' ? 'fas fa-user text-indigo-300' : 'fas fa-robot text-indigo-600';
        
        div.innerHTML = `
            <div class="flex justify-${role === 'user' ? 'end' : 'start'}">
                <div class="max-w-3xl px-4 py-3 rounded-lg ${bgColor}">
                    <div class="flex items-start space-x-2">
                        <i class="${iconClass} mt-1"></i>
                        <div class="markdown-content">
                            <div class="whitespace-pre-wrap">${isTyping ? '<i class="fas fa-spinner fa-spin mr-1"></i>' : MessageCard.render(content)}</div>
                        </div>
                    </div>
                    ${isTyping ? '<p class="text-xs mt-2 opacity-70"><i class="fas fa-spinner fa-spin mr-1"></i>AI 正在思考...</p>' : ''}
                </div>
            </div>
        `;
        
        return div;
    },
    
    render(content) {
        if (!content) return '';
        return marked.parse(content);
    },
    
    update(element, content, isTyping = false) {
        const contentDiv = element.querySelector('.markdown-content > div');
        if (contentDiv) {
            contentDiv.innerHTML = isTyping ? '<i class="fas fa-spinner fa-spin mr-1"></i> AI 正在思考...' : MessageCard.render(content);
        }
        
        if (!isTyping) {
            const typingIndicator = element.querySelector('.text-xs.mt-2');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            MarkdownRenderer.highlightCode(element);
        }
    },
    
    highlightCode(element) {
        MarkdownRenderer.highlightCode(element);
    }
};

// ==========================================
// 应用初始化
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('AI知识库助手初始化...');
    
    // 初始化Markdown渲染器
    MarkdownRenderer.init();
    
    // 初始化认证管理器
    AuthManager.init();
    
    console.log('应用初始化完成');
});

// 导出到全局（便于调试）
window.APP = APP;
window.API = API;
window.Utils = Utils;
window.AuthManager = AuthManager;
window.ChatManager = ChatManager;
window.FileManager = FileManager;