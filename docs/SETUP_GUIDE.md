# 项目配置指南

## 快速开始

### 1. 配置云环境ID ⚠️ 必须配置

#### 方法一：使用固定环境ID（推荐用于生产环境）

1. 在微信开发者工具中打开项目
2. 点击"云开发"按钮
3. 进入"设置" -> "环境设置"
4. 复制"环境ID"
5. 打开 `miniprogram/app.ts`
6. 替换第10行的 `'your-env-id'` 为实际的环境ID

```typescript
// miniprogram/app.ts
const CLOUD_ENV_ID = 'your-actual-env-id'; // 替换这里
```

#### 方法二：使用动态环境（推荐用于开发环境）

```typescript
// miniprogram/app.ts
wx.cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV, // 自动使用当前环境
  traceUser: true,
});
```

### 2. 初始化数据库 ⚠️ 必须执行

参考 [数据库初始化指南](DATABASE_SETUP.md) 完成数据库初始化。

**快速步骤**：
1. 在云开发控制台创建集合：users, orders, notifications, payments, settlements
2. 为每个集合创建必要的索引（参考 DATABASE_SETUP.md）

### 3. 部署云函数

在微信开发者工具中：
1. 右键点击每个云函数文件夹
2. 选择"上传并部署：云端安装依赖"

需要部署的云函数：
- ✅ user/loginUser
- ✅ order/createOrder
- ✅ order/submitQuote
- ✅ order/confirmWorkload
- ✅ order/cancelOrder
- ✅ payment/createPayment
- ✅ payment/payCallback
- ✅ settlement/calculatePayment
- ✅ notification/sendNotification
- ✅ database/initDatabase（可选）

### 4. 配置微信支付（如需要）

1. 在微信支付商户平台获取：
   - 商户号（MCHID）
   - 支付密钥（KEY）

2. 在云函数环境变量中配置：
   ```
   WX_PAY_MCHID=your_mchid
   WX_PAY_KEY=your_pay_key
   ```

3. 配置支付回调地址：
   ```
   https://你的云环境ID.service.weixin.qq.com/payment/payCallback
   ```

## 配置检查清单

### 必须配置项

- [ ] 云环境ID（miniprogram/app.ts）
- [ ] 数据库集合创建
- [ ] 数据库索引创建
- [ ] 云函数部署

### 可选配置项

- [ ] 微信支付配置
- [ ] JWT密钥配置（环境变量）
- [ ] 小程序AppID（已配置：wxbc618555fee468d1）

## 验证配置

### 1. 测试云开发连接

在小程序中测试：

```typescript
wx.cloud.callFunction({
  name: 'loginUser',
  data: { code: 'test' },
  success: (res) => {
    console.log('云函数调用成功', res);
  },
  fail: (err) => {
    console.error('云函数调用失败', err);
  },
});
```

### 2. 测试数据库连接

在云开发控制台的数据库管理界面中，尝试添加一条测试数据。

### 3. 检查云函数日志

在云开发控制台的"云函数" -> "日志"中查看是否有错误。

## 常见问题

### Q: 云环境ID在哪里获取？

A: 微信开发者工具 -> 云开发 -> 设置 -> 环境设置 -> 环境ID

### Q: 数据库初始化失败？

A: 
1. 确保已开通云开发
2. 确保有数据库权限
3. 参考 DATABASE_SETUP.md 手动创建

### Q: 云函数部署失败？

A:
1. 检查 package.json 是否正确
2. 检查代码是否有语法错误
3. 查看云函数日志中的错误信息

### Q: 如何切换环境？

A: 在微信开发者工具中，云开发 -> 设置 -> 环境设置 -> 切换环境

## 下一步

配置完成后：
1. 运行小程序测试基本功能
2. 测试用户登录
3. 测试订单创建
4. 测试支付流程（如已配置）

## 相关文档

- [数据库初始化指南](DATABASE_SETUP.md)
- [部署文档](DEPLOYMENT.md)
- [开发指南](DEVELOPMENT.md)
- [API文档](API.md)

