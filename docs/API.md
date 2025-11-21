# API 接口文档

## 云函数列表

### 用户相关

#### loginUser - 用户登录

**功能**: 微信登录/注册

**请求参数**:
```typescript
{
  code: string; // 微信登录code
  userInfo: {
    nickName: string;
    avatarUrl: string;
  };
}
```

**返回结果**:
```typescript
{
  success: boolean;
  userInfo?: User;
  token?: string;
  error?: string;
}
```

### 订单相关

#### createOrder - 创建订单

**功能**: 农户发布需求，创建订单

**请求参数**:
```typescript
{
  farmerId: string;
  jobType: JobType;
  pricingMode: PricingMode;
  demandInfo: {
    location: Location;
    pieceInfo?: PieceInfo;
    dailyInfo?: DailyInfo;
    monthlyInfo?: MonthlyInfo;
  };
}
```

**返回结果**:
```typescript
{
  success: boolean;
  orderId?: string;
  error?: string;
}
```

#### submitQuote - 提交报价

**功能**: 工头对订单进行报价

**请求参数**:
```typescript
{
  orderId: string;
  contractorId: string;
  quotePrice: number; // 报价（分）
}
```

**返回结果**:
```typescript
{
  success: boolean;
  error?: string;
}
```

#### confirmWorkload - 确认工作量

**功能**: 确认实际工作量，触发结算

**请求参数**:
```typescript
{
  orderId: string;
  actualWorkload: ActualWorkload;
  confirmedBy: 'farmer' | 'contractor';
}
```

**返回结果**:
```typescript
{
  success: boolean;
  bothConfirmed?: boolean;
  error?: string;
}
```

### 结算相关

#### calculatePayment - 计算支付金额

**功能**: 根据订单信息计算支付金额

**请求参数**:
```typescript
{
  orderId: string;
}
```

**返回结果**:
```typescript
{
  success: boolean;
  payment?: PaymentCalculation;
  error?: string;
}
```

### 通知相关

#### sendNotification - 发送通知

**功能**: 发送系统通知

**请求参数**:
```typescript
{
  type: string;
  target: string | string[];
  data: any;
}
```

**返回结果**:
```typescript
{
  success: boolean;
  error?: string;
}
```

