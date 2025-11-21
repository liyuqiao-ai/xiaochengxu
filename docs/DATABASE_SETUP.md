# 数据库初始化指南

## 方法一：通过云开发控制台（推荐）

### 1. 打开云开发控制台

1. 在微信开发者工具中，点击"云开发"按钮
2. 进入"数据库"管理界面

### 2. 创建集合

集合会在首次写入数据时自动创建，或者可以手动创建：

- 点击"添加集合"
- 输入集合名称
- 点击"确定"

需要创建的集合：
- `users` - 用户表
- `orders` - 订单表
- `notifications` - 通知表
- `payments` - 支付表
- `settlements` - 结算表

### 3. 创建索引

对于每个集合，需要创建以下索引：

#### users 集合

```javascript
// 在数据库控制台的"索引管理"中创建

// 索引1：openid（唯一索引）
{
  "openid": 1
}
选项：唯一索引 ✓

// 索引2：role + status
{
  "role": 1,
  "status": 1
}

// 索引3：createdAt（降序）
{
  "createdAt": -1
}
```

#### orders 集合

```javascript
// 索引1：farmerId + status
{
  "farmerId": 1,
  "status": 1
}

// 索引2：contractorId + status
{
  "contractorId": 1,
  "status": 1
}

// 索引3：introducerId
{
  "introducerId": 1
}

// 索引4：timeline.createdAt（降序）
{
  "timeline.createdAt": -1
}
```

#### notifications 集合

```javascript
// 索引：target + read + createdAt
{
  "target": 1,
  "read": 1,
  "createdAt": -1
}
```

#### payments 集合

```javascript
// 索引1：orderId
{
  "orderId": 1
}

// 索引2：userId + createdAt
{
  "userId": 1,
  "createdAt": -1
}

// 索引3：transactionId（唯一索引，稀疏）
{
  "transactionId": 1
}
选项：唯一索引 ✓，稀疏索引 ✓
```

#### settlements 集合

```javascript
// 索引1：orderId（唯一索引）
{
  "orderId": 1
}
选项：唯一索引 ✓

// 索引2：contractorId + createdAt
{
  "contractorId": 1,
  "createdAt": -1
}

// 索引3：status + createdAt
{
  "status": 1,
  "createdAt": -1
}
```

## 方法二：通过云函数初始化

### 1. 部署 initDatabase 云函数

```bash
# 在微信开发者工具中
# 右键点击 cloud-functions/database/initDatabase
# 选择"上传并部署：云端安装依赖"
```

### 2. 调用云函数

```typescript
// 在小程序中或云函数中调用
wx.cloud.callFunction({
  name: 'initDatabase',
  data: {
    action: 'initCollections',
  },
});
```

**注意**：云函数无法直接创建索引，索引仍需要在控制台手动创建。

## 方法三：使用初始化脚本

### 1. 查看脚本

查看 `scripts/init-database.js` 了解需要创建的集合和索引。

### 2. 在云开发控制台执行

在云开发控制台的数据库管理界面中，按照脚本中的说明手动创建索引。

## 验证初始化

### 检查集合

在云开发控制台的数据库管理界面中，确认以下集合已创建：
- ✅ users
- ✅ orders
- ✅ notifications
- ✅ payments
- ✅ settlements

### 检查索引

对于每个集合，在"索引管理"中确认索引已创建。

## 常见问题

### Q: 为什么需要创建索引？

A: 索引可以大幅提升查询性能，特别是对于经常查询的字段。

### Q: 索引创建失败怎么办？

A: 
1. 检查字段名是否正确
2. 检查是否已有重复的索引
3. 确保集合已创建

### Q: 可以删除索引吗？

A: 可以，但不建议删除已创建的索引，除非确定不再需要。

## 下一步

数据库初始化完成后：
1. 配置云环境ID（在 `miniprogram/app.ts` 中）
2. 部署云函数
3. 测试功能

