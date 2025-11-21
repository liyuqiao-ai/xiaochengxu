# 农业零工数字化平台

## 项目简介

农业零工数字化平台是一个连接农户、工人、工头和介绍方的综合性服务平台，支持多种计价模式（记件、按天、包月）和完整的订单管理流程。

## 技术栈

- **前端**: 微信小程序（原生框架）
- **后端**: Node.js + 微信云开发/云函数
- **数据库**: MongoDB/云数据库
- **支付**: 微信支付
- **认证**: JWT Token
- **部署**: 微信云托管

## 项目结构

```
agriculture-worker-platform/
├── miniprogram/                 # 微信小程序
│   ├── farmer/                 # 农户端
│   ├── worker/                 # 工人端  
│   ├── contractor/             # 工头端
│   └── introducer/             # 介绍方端
├── cloud-functions/            # 云函数
│   ├── order/                  # 订单相关
│   ├── payment/                # 支付相关
│   ├── settlement/             # 结算相关
│   ├── notification/           # 通知相关
│   └── user/                   # 用户相关
├── admin-dashboard/            # 管理后台
└── shared/                     # 共享代码
    ├── types/                  # TypeScript类型定义
    ├── utils/                  # 工具函数
    ├── middleware/             # 中间件
    └── constants/              # 常量定义
```

## 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0
- 微信开发者工具（最新版本）
- 微信小程序账号
- 微信云开发环境

## 配置说明

### 小程序配置

- AppID: `wxbc618555fee468d1`
- 在 `miniprogram/project.config.json` 中已配置

### 环境变量

创建 `.env` 文件：

```env
# 微信小程序配置
WX_APPID=wxbc618555fee468d1
WX_SECRET=your_secret

# 云开发环境
CLOUD_ENV_ID=your_env_id

# 数据库配置
DB_NAME=agriculture_platform

# 支付配置
WX_PAY_MCHID=your_mchid
WX_PAY_KEY=your_pay_key

# JWT配置
JWT_SECRET=your_jwt_secret
```

## 核心功能

### 1. 用户认证系统

- JWT Token认证
- 基于角色的权限控制（RBAC）
- 微信登录集成

### 2. 订单管理系统

- 三种计价模式（记件、按天、包月）
- 完整的订单状态机
- 订单取消功能
- 工作量确认

### 3. 支付系统

- 微信支付集成
- 支付预下单
- 支付回调处理
- 自动分账

### 4. 计价引擎

- 自动计算基础劳务费
- 加班费计算（1.5倍费率）
- 自动分账计算（平台费、介绍方佣金）

## 开发步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境

1. 复制 `.env.example` 为 `.env`
2. 填写相关配置信息

### 3. 初始化数据库

参考 `docs/database-init.md` 文档创建数据库集合和索引。

### 4. 开发小程序

使用微信开发者工具打开 `miniprogram` 目录

### 5. 部署云函数

```bash
# 部署所有云函数
tcb functions:deploy -e <env-id>

# 或单独部署
tcb functions:deploy createOrder -e <env-id>
```

## 云函数列表

### 用户相关
- `loginUser` - 用户登录，生成JWT Token

### 订单相关
- `createOrder` - 创建订单（需要认证）
- `submitQuote` - 提交报价（需要工头角色）
- `confirmWorkload` - 确认工作量（需要认证）
- `cancelOrder` - 取消订单（需要认证）

### 支付相关
- `createPayment` - 创建支付订单（需要认证）
- `payCallback` - 支付回调处理（微信服务器调用）

### 结算相关
- `calculatePayment` - 计算支付金额

### 通知相关
- `sendNotification` - 发送通知

## 文档

- [API接口文档](docs/API.md)
- [架构设计文档](docs/ARCHITECTURE.md)
- [部署文档](docs/DEPLOYMENT.md)
- [开发指南](docs/DEVELOPMENT.md)
- [认证和支付文档](docs/AUTH_AND_PAYMENT.md)
- [数据库初始化](docs/database-init.md)

## 许可证

MIT
