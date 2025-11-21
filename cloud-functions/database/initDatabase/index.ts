/**
 * 数据库初始化云函数
 * 
 * 用于初始化数据库集合和索引
 */

import { cloud } from 'wx-server-sdk';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 创建索引（云函数中无法直接创建索引，需要手动在控制台创建）
 * 此函数用于验证索引是否存在
 */
async function checkIndexes(collectionName: string, indexes: any[]) {
  // 注意：云函数中无法直接创建索引
  // 索引需要在云开发控制台的数据库管理界面中手动创建
  console.log(`检查集合 ${collectionName} 的索引...`);
  
  // 可以尝试查询来验证集合是否存在
  try {
    const result = await db.collection(collectionName).limit(1).get();
    console.log(`集合 ${collectionName} 存在`);
    return true;
  } catch (error) {
    console.log(`集合 ${collectionName} 不存在或无法访问`);
    return false;
  }
}

/**
 * 初始化数据库集合
 */
async function initCollections() {
  const collections = [
    'users',
    'orders',
    'notifications',
    'payments',
    'settlements',
  ];

  const results = [];

  for (const collectionName of collections) {
    try {
      // 尝试创建集合（通过写入一个文档然后删除）
      // 注意：云开发中集合会在首次写入时自动创建
      const testDoc = await db.collection(collectionName).add({
        data: {
          _init: true,
          createdAt: new Date(),
        },
      });

      // 删除测试文档
      await db.collection(collectionName).doc(testDoc._id).remove();

      results.push({
        collection: collectionName,
        status: 'created',
      });
    } catch (error: any) {
      results.push({
        collection: collectionName,
        status: 'error',
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  try {
    const { action } = event;

    if (action === 'initCollections') {
      const results = await initCollections();
      return {
        success: true,
        results,
        message: '集合初始化完成。请在云开发控制台的数据库管理界面中手动创建索引。',
      };
    }

    return {
      success: false,
      error: '未知操作',
    };
  } catch (error: any) {
    console.error('数据库初始化失败:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

