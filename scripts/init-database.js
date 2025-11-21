/**
 * 数据库初始化脚本
 * 
 * 使用方法：
 * 1. 在微信开发者工具中打开云开发控制台
 * 2. 进入数据库管理
 * 3. 在控制台执行以下命令，或使用此脚本
 */

// 注意：此脚本需要在云开发控制台的数据库控制台中执行
// 或者通过云函数执行

const collections = [
  {
    name: 'users',
    indexes: [
      { keys: { openid: 1 }, options: { unique: true } },
      { keys: { role: 1, status: 1 } },
      { keys: { createdAt: -1 } },
    ],
  },
  {
    name: 'orders',
    indexes: [
      { keys: { farmerId: 1, status: 1 } },
      { keys: { contractorId: 1, status: 1 } },
      { keys: { introducerId: 1 } },
      { keys: { 'timeline.createdAt': -1 } },
    ],
  },
  {
    name: 'notifications',
    indexes: [
      { keys: { target: 1, read: 1, createdAt: -1 } },
    ],
  },
  {
    name: 'payments',
    indexes: [
      { keys: { orderId: 1 } },
      { keys: { userId: 1, createdAt: -1 } },
      { keys: { transactionId: 1 }, options: { unique: true, sparse: true } },
    ],
  },
  {
    name: 'settlements',
    indexes: [
      { keys: { orderId: 1 }, options: { unique: true } },
      { keys: { contractorId: 1, createdAt: -1 } },
      { keys: { status: 1, createdAt: -1 } },
    ],
  },
];

/**
 * 初始化数据库（在云开发控制台执行）
 */
function initDatabase() {
  console.log('开始初始化数据库...');

  collections.forEach((collection) => {
    console.log(`\n创建集合: ${collection.name}`);
    
    // 创建集合（如果不存在）
    // 在云开发控制台中，集合会在首次写入时自动创建
    
    // 创建索引
    collection.indexes.forEach((index, idx) => {
      console.log(`  创建索引 ${idx + 1}:`, index.keys);
      // 在云开发控制台的数据库管理界面中手动创建索引
      // 或使用以下命令格式：
      // db.collection('collectionName').createIndex({ field: 1 })
    });
  });

  console.log('\n数据库初始化完成！');
  console.log('请在云开发控制台的数据库管理界面中手动创建索引。');
}

// 导出供云函数使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { collections, initDatabase };
}

// 如果在浏览器控制台直接执行
if (typeof window !== 'undefined') {
  window.initDatabase = initDatabase;
}

