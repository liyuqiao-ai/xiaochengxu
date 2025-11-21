# 开发指南

## 本地开发环境搭建

### 1. 安装依赖

```bash
npm install
```

### 2. 配置开发环境

1. 复制 `.env.example` 为 `.env`
2. 填写相关配置信息

### 3. 启动开发

#### 小程序开发

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 配置 AppID 和云环境 ID
3. 开始开发

#### 云函数开发

1. 在微信开发者工具中打开云函数目录
2. 修改云函数代码
3. 右键点击云函数文件夹，选择"上传并部署：云端安装依赖"

## 代码规范

### TypeScript

- 使用严格模式
- 所有函数必须有类型定义
- 避免使用 `any` 类型

### 命名规范

- 文件名：小写字母，使用连字符（kebab-case）
- 类名：大驼峰（PascalCase）
- 函数名：小驼峰（camelCase）
- 常量：大写下划线（UPPER_SNAKE_CASE）

### 代码结构

```
云函数/
├── index.ts          # 入口文件
├── package.json      # 依赖配置
└── config/           # 配置文件（可选）

小程序页面/
├── index.ts          # 页面逻辑
├── index.wxml        # 页面结构
├── index.wxss        # 页面样式
└── index.json        # 页面配置
```

## 开发流程

### 1. 创建新功能

1. 在 `shared/types` 中定义类型
2. 在 `shared/utils` 中实现工具函数
3. 在 `cloud-functions` 中创建云函数
4. 在小程序中创建页面
5. 编写测试用例
6. 更新文档

### 2. 调试技巧

#### 云函数调试

```typescript
// 使用 console.log 输出日志
console.log('调试信息:', data);

// 在微信开发者工具中查看云函数日志
```

#### 小程序调试

```typescript
// 使用 console.log
console.log('调试信息:', data);

// 使用 wx.showModal 显示调试信息
wx.showModal({
  title: '调试',
  content: JSON.stringify(data),
});
```

### 3. 测试

#### 单元测试

```bash
npm test
```

#### 集成测试

在微信开发者工具中测试完整流程。

## 常见问题

### Q: 云函数无法调用共享代码？

A: 确保 `tsconfig.json` 中配置了正确的路径别名，并且云函数中正确引用了共享代码。

### Q: 小程序无法调用云函数？

A: 检查：
1. 云函数是否已部署
2. 云环境 ID 是否正确
3. 云函数名称是否正确

### Q: 类型错误？

A: 确保：
1. 安装了所有依赖
2. TypeScript 配置正确
3. 共享类型定义正确导入

## 提交代码

1. 确保代码通过 lint 检查
2. 确保所有测试通过
3. 更新 CHANGELOG.md
4. 提交代码并创建 PR

