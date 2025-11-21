# 认证和支付系统文档

## 1. JWT Token 认证系统

### Token 生成

在用户登录时，系统会生成JWT Token：

```typescript
import { generateToken } from '../../../shared/utils/jwt';

const token = generateToken({
  userId: user._id,
  openid: user.openid,
  role: user.role,
});
```

### Token 验证

使用认证中间件验证Token：

```typescript
import { authMiddleware } from '../../../shared/middleware/auth';

const authResult = authMiddleware(event);
if (!authResult.success) {
  return authResult.response;
}
const { context } = authResult;
// context 包含 userId, openid, role
```

### Token 结构

```typescript
interface JWTPayload {
  userId: string;      // 用户ID
  openid: string;      // 微信openid
  role: string;       // 用户角色
  iat: number;        // 签发时间
  exp: number;        // 过期时间（7天）
}
```

## 2. 权限控制系统

### 角色定义

- `farmer` - 农户
- `worker` - 工人
- `contractor` - 工头
- `introducer` - 介绍方

### 权限检查

```typescript
import { requireRole } from '../../../shared/middleware/auth';

// 检查角色
const roleCheck = requireRole(['contractor'])(event, context);
if (!roleCheck.success) {
  return roleCheck.response;
}
```

### 权限规则

| 操作 | 农户 | 工人 | 工头 | 介绍方 |
|------|------|------|------|--------|
| 发布需求 | ✅ | ❌ | ❌ | ❌ |
| 报价 | ❌ | ❌ | ✅ | ❌ |
| 取消订单 | ✅ | ❌ | ✅ | ❌ |
| 支付订单 | ✅ | ❌ | ❌ | ❌ |
| 确认工作量 | ✅ | ❌ | ✅ | ❌ |

## 3. 订单状态机

### 状态定义

- `pending` - 待报价
- `quoted` - 已报价
- `confirmed` - 已确认
- `in_progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消

### 状态转换规则

```
pending → quoted → confirmed → in_progress → completed
   ↓         ↓          ↓
cancelled cancelled cancelled
```

### 使用示例

```typescript
import { OrderStateMachine } from '../../../shared/utils/orderStateMachine';

// 检查是否可以转换
if (!OrderStateMachine.canCancel(order.status)) {
  return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID);
}

// 执行状态转换
const result = OrderStateMachine.transition(order.status, 'cancelled');
if (!result.success) {
  return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, result.error);
}
```

## 4. 微信支付集成

### 支付流程

1. **创建支付订单** (`createPayment`)
   - 验证订单和用户权限
   - 计算支付金额
   - 调用微信支付统一下单API
   - 生成小程序支付参数

2. **小程序发起支付**
   ```typescript
   wx.requestPayment({
     timeStamp: paymentParams.timeStamp,
     nonceStr: paymentParams.nonceStr,
     package: paymentParams.package,
     signType: paymentParams.signType,
     paySign: paymentParams.paySign,
   });
   ```

3. **支付回调处理** (`payCallback`)
   - 验证回调签名
   - 更新支付记录
   - 更新订单状态
   - 触发自动分账

### 支付配置

需要在环境变量中配置：

```env
WX_PAY_MCHID=your_mchid
WX_PAY_KEY=your_pay_key
CLOUD_BASE_URL=your_cloud_base_url
```

### 支付金额计算

支付金额 = 基础劳务费 + 介绍方佣金

分账规则：
- 工头实收 = 基础劳务费 - 平台服务费
- 平台服务费 = 基础劳务费 × 5%
- 介绍方佣金 = 基础劳务费 × 2%

## 5. 云函数列表

### 认证相关

- `loginUser` - 用户登录，生成JWT Token

### 订单相关

- `createOrder` - 创建订单（需要认证）
- `submitQuote` - 提交报价（需要工头角色）
- `confirmWorkload` - 确认工作量（需要认证）
- `cancelOrder` - 取消订单（需要认证）

### 支付相关

- `createPayment` - 创建支付订单（需要认证）
- `payCallback` - 支付回调处理（微信服务器调用）

## 6. 使用示例

### 带认证的云函数调用

```typescript
// 小程序端
const result = await wx.cloud.callFunction({
  name: 'createOrder',
  data: {
    jobType: 'harvest',
    pricingMode: 'piece',
    demandInfo: { ... },
  },
  // Token会自动从storage中获取并添加到header
});
```

### 云函数中验证Token

```typescript
export const main = async (event: any) => {
  // 1. 认证检查
  const authResult = authMiddleware(event);
  if (!authResult.success) {
    return authResult.response;
  }
  const { context } = authResult;

  // 2. 权限检查
  const roleCheck = requireRole(['farmer'])(event, context);
  if (!roleCheck.success) {
    return roleCheck.response;
  }

  // 3. 业务逻辑
  // ...
};
```

## 7. 安全注意事项

1. **Token安全**
   - Token存储在客户端storage中
   - Token有效期7天
   - Token包含用户敏感信息，需要HTTPS传输

2. **支付安全**
   - 所有支付金额在服务端计算
   - 支付回调必须验证签名
   - 支付记录需要幂等性处理

3. **权限控制**
   - 所有敏感操作都需要认证
   - 角色权限在服务端验证
   - 订单操作需要验证所有权

## 8. 错误码

| 错误码 | 说明 |
|--------|------|
| 2001 | 用户未授权 |
| 2002 | 用户角色不匹配 |
| 3001 | 订单状态无效 |
| 3005 | 订单无法取消 |
| 4001 | 支付失败 |
| 4002 | 支付金额无效 |

