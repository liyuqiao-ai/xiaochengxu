# 环境配置说明

## 已配置的环境ID

**云环境ID**: `cloud1-3g2i1jqra6ba039d`

## 配置文件位置

### 1. 小程序配置

- **文件**: `miniprogram/app.ts`
- **配置项**: `CLOUD_ENV_ID`
- **当前值**: `cloud1-3g2i1jqra6ba039d` ✅

### 2. 环境配置文件

- **文件**: `miniprogram/config/env.ts`
- **配置项**: `CLOUD_ENV_ID`
- **当前值**: `cloud1-3g2i1jqra6ba039d` ✅

## 支付回调地址配置

### 微信支付回调地址

支付回调地址格式：
```
https://cloud1-3g2i1jqra6ba039d.service.weixin.qq.com/payment/payCallback
```

### 配置步骤

1. **在微信支付商户平台配置回调地址**：
   - 登录微信支付商户平台
   - 进入"产品中心" -> "开发配置"
   - 设置"支付回调URL"为上述地址

2. **或者使用云函数HTTP触发地址**：
   - 在云开发控制台 -> 云函数 -> payCallback
   - 开启HTTP触发
   - 复制HTTP触发地址
   - 在支付配置中使用该地址

## 云函数环境变量配置

在云开发控制台配置以下环境变量：

### 必须配置

```env
# 微信支付配置（如需要）
WX_PAY_MCHID=your_mchid
WX_PAY_KEY=your_pay_key

# 支付回调基础URL（可选，默认使用环境ID构建）
CLOUD_BASE_URL=https://cloud1-3g2i1jqra6ba039d.service.weixin.qq.com
```

### 可选配置

```env
# JWT密钥（如需要自定义）
JWT_SECRET=your_jwt_secret
```

## 验证配置

### 1. 验证云环境连接

在小程序中测试：

```typescript
wx.cloud.callFunction({
  name: 'loginUser',
  data: { code: 'test' },
  success: (res) => {
    console.log('✅ 云环境连接成功');
  },
  fail: (err) => {
    console.error('❌ 云环境连接失败', err);
  },
});
```

### 2. 验证数据库连接

在云开发控制台的数据库管理界面中：
- 确认可以访问数据库
- 确认集合已创建

### 3. 验证云函数

在云开发控制台的云函数管理界面中：
- 确认所有云函数已部署
- 查看云函数日志确认无错误

## 相关文档

- [项目配置指南](SETUP_GUIDE.md)
- [数据库初始化](DATABASE_SETUP.md)
- [部署文档](DEPLOYMENT.md)

