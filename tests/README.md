# 测试说明

## 测试结构

```
tests/
├── unit/              # 单元测试
│   ├── pricing.test.ts
│   └── orderStateMachine.test.ts
└── integration/       # 集成测试
    └── orderFlow.test.ts
```

## 运行测试

```bash
# 安装测试依赖
npm install --save-dev jest @types/jest

# 运行单元测试
npm test

# 运行集成测试
npm run test:integration
```

## 测试覆盖率目标

- 单元测试覆盖率 > 80%
- 核心业务逻辑覆盖率 > 90%

## 待实现的测试

1. 云函数集成测试
2. 支付流程测试
3. 权限控制测试
4. 性能测试

