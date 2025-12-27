# 汗蒸门店管理系统

这是一个完整的汗蒸门店会员+分销管理系统，包含用户端H5、员工端和后台管理端。

## 系统架构

### 后端服务
- Node.js + Express + TypeScript
- MongoDB数据库
- JWT身份验证
- 角色权限管理（用户/员工/管理员）

### 前端应用
1. **用户端H5** - Vue 3 + Vant UI
   - 会员注册/登录
   - 套餐购买
   - 会员码展示
   - 核销记录查询
   - 分销中心

2. **员工端H5** - Vue 3 + Vant UI
   - 员工登录
   - 扫码查会员
   - 扣次核销
   - 手动录入购买

3. **管理后台** - Vue 3 + Element Plus
   - 门店管理
   - 员工管理
   - 套餐配置
   - 分销规则设置
   - 数据统计

## 核心功能

### 1. 次卡/套餐管理
- 配置多种套餐类型（次数、价格、有效期）
- 支持门店限制
- 购买记录管理
- 次卡叠加规则

### 2. 核销系统
- 会员码扫码识别
- 智能扣次策略（FEFO - 先到期的先用）
- 核销记录追溯
- 撤销核销功能

### 3. 分销体系
- 三级分销模式
- 邀请绑定机制
- 佣金计算（基于购买金额）
- 佣金提现

### 4. 门店管理
- 多门店支持
- 员工权限管理
- 门店数据统计
- 操作日志

## 技术栈

### 后端
- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JWT
- QRCode.js

### 前端
- Vue 3
- TypeScript
- Vant UI (移动端)
- Element Plus (管理后台)
- Vue Router
- Pinia/Vuex
- Axios

## 快速开始

### 环境要求
- Node.js >= 16
- MongoDB >= 4.4
- npm 或 yarn

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd project
```

2. 安装依赖
```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend/h5
npm install

cd ../staff
npm install

cd ../admin
npm install
```

3. 配置环境变量
```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库和JWT密钥
```

4. 启动服务
```bash
# 启动后端 (开发模式)
npm run dev

# 启动前端
cd frontend/h5
npm run dev

cd ../staff
npm run dev

cd ../admin
npm run dev
```

## 项目结构

```
project/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # 路由
│   │   ├── utils/          # 工具函数
│   │   ├── app.ts          # Express应用
│   │   └── server.ts       # 服务器入口
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── h5/                 # 用户端H5
│   ├── staff/             # 员工端
│   └── admin/             # 管理后台
├── README.md
└── package.json
```

## API文档

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/staff-login` - 员工登录
- `POST /api/auth/admin-login` - 管理员登录

### 用户端
- `GET /api/user/profile` - 获取用户信息
- `GET /api/user/packages` - 获取用户套餐
- `GET /api/user/redemptions` - 获取核销记录
- `GET /api/user/purchases` - 获取购买记录
- `POST /api/user/invite/bind` - 绑定邀请码

### 员工端
- `GET /api/staff/profile` - 获取员工信息
- `POST /api/staff/verify-member` - 验证会员
- `POST /api/staff/redeem` - 核销套餐
- `POST /api/staff/purchase` - 手动录入购买

### 管理端
- `POST /api/admin/stores` - 创建门店
- `GET /api/admin/stores` - 获取门店列表
- `POST /api/admin/staff` - 创建员工
- `GET /api/admin/users` - 获取用户列表
- `POST /api/admin/packages` - 创建套餐
- `GET /api/admin/redemptions` - 获取核销记录
- `GET /api/admin/purchases` - 获取购买记录

### 分销系统
- `GET /api/commission/config/:level` - 获取分销配置
- `POST /api/admin/commission/config` - 更新分销配置
- `GET /api/commission/records` - 获取佣金记录
- `POST /api/commission/withdraw` - 佣金提现

## 核心算法

### 核销策略 (FEFO)
1. 获取用户所有可用的套餐
2. 按到期时间排序（先到期的优先）
3. 检查套餐是否适用于当前门店
4. 验证套餐有效期和剩余次数
5. 按顺序扣减次数

### 佣金计算
```typescript
佣金金额 = 购买金额 × 佣金比例 × 邀请人等级系数
```

### 等级升级
根据用户累计消费金额自动升级：
- 一级分销商：0-4999元
- 二级分销商：5000-19999元
- 三级分销商：20000元以上

## 安全特性

- JWT令牌认证
- 密码加密存储（bcrypt）
- 角色权限控制
- API速率限制
- CORS防护
- 操作日志记录

## 部署建议

### 生产环境
- 使用PM2运行Node.js服务
- 配置Nginx反向代理
- 启用HTTPS
- 配置MongoDB副本集
- 设置定时备份

### 性能优化
- 使用Redis缓存
- 启用Gzip压缩
- 配置CDN加速静态资源
- 实施懒加载策略

## 维护与支持

### 监控指标
- API响应时间
- 错误率
- 用户活跃度
- 分销转化率

### 备份策略
- 数据库每日备份
- 配置版本控制
- 定期测试恢复流程

## 扩展功能

### 计划中的功能
- [ ] 在线支付集成
- [ ] 微信小程序版本
- [ ] 短信通知服务
- [ ] 数据导出功能
- [ ] 多语言支持

## 许可证

MIT License

## 联系方式

项目维护：技术团队
邮箱：support@example.com

---

**文档版本**: 1.0.0  
**最后更新**: 2024年12月27日  
**系统版本**: v1.0.0