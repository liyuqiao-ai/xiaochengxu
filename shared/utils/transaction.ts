/**
 * 数据库事务工具
 * 注意：微信云数据库不支持传统事务，这里使用乐观锁和条件更新来保证原子性
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from './db';

const db = cloud.database();

/**
 * 使用条件更新实现原子性操作
 * @param collection 集合名
 * @param docId 文档ID
 * @param condition 条件对象（用于乐观锁）
 * @param updateData 更新数据
 * @returns 是否更新成功
 */
export async function atomicUpdate(
  collection: string,
  docId: string,
  condition: Record<string, any>,
  updateData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 使用条件更新：只有当条件满足时才更新
    const result = await db
      .collection(collection)
      .doc(docId)
      .where(condition)
      .update({
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

    // 检查是否更新成功（微信云数据库返回的stats.updated表示更新的文档数）
    if (result.stats && result.stats.updated === 0) {
      return {
        success: false,
        error: '更新失败：条件不满足或数据已被修改',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('原子更新失败:', error);
    return {
      success: false,
      error: error.message || '原子更新失败',
    };
  }
}

/**
 * 使用版本号实现乐观锁
 * @param collection 集合名
 * @param docId 文档ID
 * @param updateFn 更新函数，接收当前文档，返回更新数据
 * @param maxRetries 最大重试次数
 */
export async function optimisticUpdate<T>(
  collection: string,
  docId: string,
  updateFn: (currentDoc: T) => Record<string, any>,
  maxRetries = 3
): Promise<{ success: boolean; data?: T; error?: string }> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // 1. 读取当前文档（包含版本号）
      const docResult = await db.collection(collection).doc(docId).get();
      if (!docResult.data) {
        return { success: false, error: '文档不存在' };
      }

      const currentDoc = docResult.data as T & { _version?: number };
      const currentVersion = currentDoc._version || 0;

      // 2. 计算更新数据
      const updateData = updateFn(currentDoc);

      // 3. 使用版本号作为条件进行更新
      const updateResult = await db
        .collection(collection)
        .doc(docId)
        .where({
          _version: currentVersion, // 只有当版本号匹配时才更新
        })
        .update({
          data: {
            ...updateData,
            _version: currentVersion + 1, // 版本号递增
            updatedAt: new Date(),
          },
        });

      // 4. 检查是否更新成功
      if (updateResult.stats && updateResult.stats.updated > 0) {
        // 重新读取更新后的文档
        const updatedResult = await db.collection(collection).doc(docId).get();
        return { success: true, data: updatedResult.data as T };
      }

      // 5. 如果更新失败，说明版本号不匹配，重试
      retries++;
      if (retries >= maxRetries) {
        return { success: false, error: '更新失败：已达到最大重试次数' };
      }

      // 等待一小段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 100 * retries));
    } catch (error: any) {
      console.error('乐观锁更新失败:', error);
      return { success: false, error: error.message || '乐观锁更新失败' };
    }
  }

  return { success: false, error: '更新失败' };
}

/**
 * 批量原子操作（使用批量写入）
 */
export async function atomicBatch(
  operations: Array<{
    type: 'update';
    collection: string;
    docId: string;
    condition?: Record<string, any>;
    data: Record<string, any>;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = db.batch();

    for (const op of operations) {
      const docRef = db.collection(op.collection).doc(op.docId);

      if (op.condition) {
        // 如果有条件，需要先查询
        const queryResult = await db
          .collection(op.collection)
          .doc(op.docId)
          .where(op.condition)
          .get();

        if (queryResult.data.length === 0) {
          return { success: false, error: `操作失败：条件不满足 [${op.collection}/${op.docId}]` };
        }
      }

      batch.update(docRef, {
        data: {
          ...op.data,
          updatedAt: new Date(),
        },
      });
    }

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error('批量原子操作失败:', error);
    return { success: false, error: error.message || '批量原子操作失败' };
  }
}

