# 数据库初始化文档

## 集合创建

### 1. users 集合（用户表）

```javascript
// 创建集合
db.createCollection('users');

// 创建索引
db.users.createIndex({ openid: 1 }, { unique: true });
db.users.createIndex({ role: 1, status: 1 });
db.users.createIndex({ createdAt: -1 });
```

### 2. orders 集合（订单表）

```javascript
// 创建集合
db.createCollection('orders');

// 创建索引
db.orders.createIndex({ farmerId: 1, status: 1 });
db.orders.createIndex({ contractorId: 1, status: 1 });
db.orders.createIndex({ introducerId: 1 });
db.orders.createIndex({ 'timeline.createdAt': -1 });
db.orders.createIndex({ location: '2dsphere' }); // 地理位置索引
```

### 3. notifications 集合（通知表）

```javascript
// 创建集合
db.createCollection('notifications');

// 创建索引
db.notifications.createIndex({ target: 1, read: 1, createdAt: -1 });
```

### 4. payments 集合（支付表）

```javascript
// 创建集合
db.createCollection('payments');

// 创建索引
db.payments.createIndex({ orderId: 1 });
db.payments.createIndex({ userId: 1, createdAt: -1 });
db.payments.createIndex({ transactionId: 1 }, { unique: true });
```

### 5. settlements 集合（结算表）

```javascript
// 创建集合
db.createCollection('settlements');

// 创建索引
db.settlements.createIndex({ orderId: 1 }, { unique: true });
db.settlements.createIndex({ contractorId: 1, createdAt: -1 });
db.settlements.createIndex({ status: 1, createdAt: -1 });
```

## 初始数据

### 工种配置

```javascript
db.jobTypes.insertMany([
  { type: 'harvest', name: '收割', units: ['acre', 'jin'] },
  { type: 'plant', name: '种植', units: ['acre'] },
  { type: 'fertilize', name: '施肥', units: ['acre'] },
  { type: 'pesticide', name: '打药', units: ['acre'] },
  { type: 'weeding', name: '除草', units: ['acre', 'daily'] },
  { type: 'management', name: '管理', units: ['daily', 'monthly'] },
]);
```

### 平台配置

```javascript
db.config.insertOne({
  fees: {
    platformFeeRate: 0.05,
    introducerCommissionRate: 0.02,
    paymentFeeRate: 0.003,
  },
  pricing: {
    standardWorkingHours: 8,
    overtimeRateMultiplier: 1.5,
    monthlyStandardHours: 208,
  },
  business: {
    maxOrderAmount: 50000,
    autoConfirmHours: 24,
    settlementDays: 1,
  },
});
```

## 数据迁移脚本

创建 `scripts/migrate.js`:

```javascript
// 数据库迁移脚本
const db = require('./db');

async function migrate() {
  // 执行迁移操作
  console.log('开始数据库迁移...');
  
  // TODO: 实现迁移逻辑
  
  console.log('数据库迁移完成');
}

migrate();
```

