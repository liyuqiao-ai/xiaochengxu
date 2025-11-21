# 订单状态流转文档

## 状态定义

订单有以下状态：

- `pending` - 待报价
- `quoted` - 已报价
- `confirmed` - 已确认
- `in_progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消

## 状态流转图

```
pending (待报价)
  ↓ [工头报价]
quoted (已报价)
  ↓ [农户接受]      ↓ [取消]
confirmed (已确认)  cancelled (已取消)
  ↓ [开始工作]      ↓
in_progress (进行中)
  ↓ [完成工作]
completed (已完成)
```

## 状态转换规则

### 1. pending → quoted

**触发条件**：
- 工头提交报价

**验证规则**：
- ✅ 订单状态必须是 `pending`
- ✅ 工头必须已认证（certification.status === 'approved'）
- ✅ 工头账号必须激活（status === 'active'）
- ✅ 报价金额必须大于0

**执行操作**：
- 更新订单状态为 `quoted`
- 记录报价时间（timeline.quotedAt）
- 保存报价金额
- 发送通知给农户

**相关云函数**：
- `submitQuote`

### 2. quoted → confirmed

**触发条件**：
- 农户接受报价

**验证规则**：
- ✅ 订单状态必须是 `quoted`
- ✅ 必须是订单的农户操作

**执行操作**：
- 更新订单状态为 `confirmed`
- 记录确认时间（timeline.confirmedAt）
- 发送通知给工头

**相关云函数**：
- `acceptQuote`

### 3. confirmed → in_progress

**触发条件**：
- 农户或工头开始工作

**验证规则**：
- ✅ 订单状态必须是 `confirmed`
- ✅ 必须是订单相关的农户或工头操作

**执行操作**：
- 更新订单状态为 `in_progress`
- 记录开始时间（timeline.startedAt）
- 发送通知

**相关云函数**：
- `updateOrderStatus`

### 4. in_progress → completed

**触发条件**：
- 双方确认工作量后自动完成

**验证规则**：
- ✅ 订单状态必须是 `in_progress`
- ✅ 农户和工头都确认了工作量

**执行操作**：
- 计算支付金额
- 更新订单状态为 `completed`
- 记录完成时间（timeline.completedAt）
- 触发自动分账（如果已支付）

**相关云函数**：
- `confirmWorkload`

### 5. 任意状态 → cancelled

**触发条件**：
- 农户或工头取消订单

**验证规则**：
- ✅ 订单状态必须是 `pending`、`quoted` 或 `confirmed`
- ✅ 必须是订单相关的农户或工头操作

**执行操作**：
- 更新订单状态为 `cancelled`
- 记录取消时间（timeline.cancelledAt）
- 记录取消原因
- 发送通知

**相关云函数**：
- `cancelOrder`

## 状态机验证

### 使用 OrderStateMachine

```typescript
import { OrderStateMachine } from '../../../shared/utils/orderStateMachine';

// 检查是否可以报价
if (!OrderStateMachine.canQuote(order.status)) {
  return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID);
}

// 执行状态转换
const result = OrderStateMachine.transition(order.status, 'quoted');
if (!result.success) {
  return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, result.error);
}
```

### 使用 isValidStatusTransition

```typescript
import { isValidStatusTransition } from '../../../shared/utils/validation';

// 验证状态转换是否合法
if (!isValidStatusTransition(order.status, 'quoted')) {
  return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID);
}
```

## 状态验证最佳实践

### 双重验证

在 `submitQuote` 中使用了双重验证：

1. **直接状态检查**：
   ```typescript
   if (order.status !== 'pending') {
     return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID);
   }
   ```

2. **状态机验证**：
   ```typescript
   if (!OrderStateMachine.canQuote(order.status)) {
     return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID);
   }
   ```

3. **状态转换验证**：
   ```typescript
   if (!isValidStatusTransition(order.status, 'quoted')) {
     return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID);
   }
   ```

这样可以确保状态转换的严格性和安全性。

## 状态查询方法

### OrderStateMachine 提供的方法

- `canQuote(status)` - 是否可以报价
- `canCancel(status)` - 是否可以取消
- `canConfirm(status)` - 是否可以确认
- `canStart(status)` - 是否可以开始
- `canComplete(status)` - 是否可以完成
- `getAllowedTransitions(status)` - 获取允许的状态转换

## 注意事项

1. **状态转换的原子性**：状态转换和数据库更新应该在同一个事务中完成
2. **并发控制**：多个请求同时修改订单状态时需要加锁
3. **状态历史**：建议记录状态变更历史，便于追踪和审计
4. **回滚机制**：某些状态转换可能需要支持回滚

## 相关文档

- [订单状态机实现](shared/utils/orderStateMachine.ts)
- [状态验证工具](shared/utils/validation.ts)
- [API文档](API.md)

