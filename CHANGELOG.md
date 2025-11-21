# 更新日志

## v1.2.0 (2024-01-XX)

### 新增功能

- ✅ **JWT Token认证系统**: 实现了完整的JWT token生成和验证
- ✅ **认证中间件**: 创建了token验证中间件，统一处理认证逻辑
- ✅ **权限控制系统**: 实现了基于角色的权限控制（RBAC）
- ✅ **订单状态机**: 完成了订单状态机的实现，规范状态转换
- ✅ **订单取消功能**: 添加了订单取消云函数，支持农户和工头取消订单
- ✅ **微信支付集成**: 集成了微信支付功能
- ✅ **支付预下单**: 实现了支付预下单云函数
- ✅ **支付回调处理**: 实现了微信支付回调处理云函数

### 新增文件

- `shared/utils/jwt.ts` - JWT token生成和验证工具
- `shared/middleware/auth.ts` - 认证和权限控制中间件
- `shared/utils/orderStateMachine.ts` - 订单状态机
- `cloud-functions/order/cancelOrder/` - 订单取消云函数
- `cloud-functions/payment/createPayment/` - 支付预下单云函数
- `cloud-functions/payment/payCallback/` - 支付回调处理云函数
- `docs/AUTH_AND_PAYMENT.md` - 认证和支付系统文档

### 修改文件

- `miniprogram/project.config.json` - 更新appid为 `wxbc618555fee468d1`
- `cloud-functions/user/loginUser/index.ts` - 使用新的JWT token生成
- `cloud-functions/order/submitQuote/index.ts` - 添加认证和权限检查，使用状态机

### 技术改进

1. **JWT Token系统**
   - 使用HMAC-SHA256签名
   - Token有效期7天
   - 包含用户ID、openid、角色等信息

2. **权限控制**
   - 基于角色的访问控制（RBAC）
   - 支持多角色权限检查
   - 统一的权限错误处理

3. **订单状态机**
   - 规范的状态转换规则
   - 状态转换验证
   - 状态查询方法

4. **微信支付**
   - 统一下单API集成
   - 支付签名生成和验证
   - 支付回调处理
   - 自动分账触发

## v1.1.0 (2024-01-XX)

### 改进

- ✅ **数据库操作封装**: 创建了 `Database` 工具类，统一封装所有数据库操作
- ✅ **错误处理统一**: 实现了统一的错误码和错误消息系统
- ✅ **代码优化**: 所有云函数已更新为使用新的工具类和错误处理
- ✅ **配置完善**: 确认所有云函数都有完整的 package.json 配置

## v1.0.0 (2024-01-XX)

### 新增功能

- ✅ 项目基础结构搭建
- ✅ 完整的 TypeScript 类型定义
- ✅ 计价引擎实现
- ✅ 云函数实现
- ✅ 小程序前端
- ✅ 数据验证工具
- ✅ 文档
