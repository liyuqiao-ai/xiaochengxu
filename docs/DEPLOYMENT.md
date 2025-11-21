# 部署文档

## 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0
- 微信开发者工具（最新版本）
- 微信小程序账号
- 微信云开发环境

## 开发环境配置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置小程序

1. 打开微信开发者工具
2. 导入项目，选择 `miniprogram` 目录
3. 配置 AppID（在 `project.config.json` 中）
4. 配置云环境 ID（在 `app.ts` 中）

### 3. 配置云开发

1. 在微信开发者工具中开通云开发
2. 创建云环境
3. 获取云环境 ID
4. 在代码中配置云环境 ID

### 4. 初始化数据库

参考 `docs/database-init.md` 文档创建数据库集合和索引。

## 云函数部署

### 方式一：使用微信开发者工具

1. 在微信开发者工具中打开云函数目录
2. 右键点击云函数文件夹
3. 选择"上传并部署：云端安装依赖"

### 方式二：使用 CLI

```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
tcb functions:deploy createOrder -e <env-id>
tcb functions:deploy submitQuote -e <env-id>
tcb functions:deploy confirmWorkload -e <env-id>
tcb functions:deploy calculatePayment -e <env-id>
tcb functions:deploy sendNotification -e <env-id>
tcb functions:deploy loginUser -e <env-id>
```

## 小程序发布

### 1. 开发版本

1. 在微信开发者工具中点击"上传"
2. 填写版本号和项目备注
3. 上传成功后可在小程序后台查看

### 2. 体验版本

1. 在小程序后台选择开发版本
2. 点击"选为体验版"
3. 添加体验者

### 3. 正式发布

1. 提交审核
2. 等待审核通过
3. 发布上线

## 环境变量配置

创建 `.env` 文件（参考 `.env.example`）：

```env
WX_APPID=your_appid
WX_SECRET=your_secret
CLOUD_ENV_ID=your_env_id
DB_NAME=agriculture_platform
WX_PAY_MCHID=your_mchid
WX_PAY_KEY=your_pay_key
JWT_SECRET=your_jwt_secret
```

## 监控和日志

1. 在微信云开发控制台查看云函数日志
2. 配置告警规则
3. 监控错误率和响应时间

## 备份和恢复

1. 定期备份数据库
2. 保存云函数代码版本
3. 记录配置变更

