/**
 * 数据库操作工具类
 */

import { cloud } from 'wx-server-sdk';
import { ErrorCode, createDatabaseErrorResponse, createErrorResponse } from './errors';

/**
 * 数据库工具类
 */
export class Database {
  private db: any;

  constructor() {
    this.db = cloud.database();
  }

  /**
   * 获取文档
   */
  async getDoc(collection: string, docId: string): Promise<any> {
    try {
      const result = await this.db.collection(collection).doc(docId).get();
      return result.data || null;
    } catch (error: any) {
      console.error(`获取文档失败 [${collection}/${docId}]:`, error);
      throw new Error(`数据库查询失败: ${error.message}`);
    }
  }

  /**
   * 创建文档
   */
  async addDoc(collection: string, data: any): Promise<string> {
    try {
      const result = await this.db.collection(collection).add({
        data: {
          ...data,
          createdAt: data.createdAt || new Date(),
          updatedAt: new Date(),
        },
      });
      return result._id;
    } catch (error: any) {
      console.error(`创建文档失败 [${collection}]:`, error);
      throw new Error(`数据库创建失败: ${error.message}`);
    }
  }

  /**
   * 更新文档
   */
  async updateDoc(collection: string, docId: string, data: any): Promise<void> {
    try {
      await this.db.collection(collection).doc(docId).update({
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      console.error(`更新文档失败 [${collection}/${docId}]:`, error);
      throw new Error(`数据库更新失败: ${error.message}`);
    }
  }

  /**
   * 删除文档
   */
  async deleteDoc(collection: string, docId: string): Promise<void> {
    try {
      await this.db.collection(collection).doc(docId).remove();
    } catch (error: any) {
      console.error(`删除文档失败 [${collection}/${docId}]:`, error);
      throw new Error(`数据库删除失败: ${error.message}`);
    }
  }

  /**
   * 查询文档列表
   */
  async queryDocs(
    collection: string,
    where?: any,
    options?: {
      orderBy?: { field: string; order: 'asc' | 'desc' };
      limit?: number;
      skip?: number;
    }
  ): Promise<any[]> {
    try {
      let query = this.db.collection(collection);

      if (where) {
        query = query.where(where);
      }

      if (options?.orderBy) {
        query = query.orderBy(options.orderBy.field, options.orderBy.order);
      }

      if (options?.skip) {
        query = query.skip(options.skip);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const result = await query.get();
      return result.data || [];
    } catch (error: any) {
      console.error(`查询文档列表失败 [${collection}]:`, error);
      throw new Error(`数据库查询失败: ${error.message}`);
    }
  }

  /**
   * 统计文档数量
   */
  async countDocs(collection: string, where?: any): Promise<number> {
    try {
      let query = this.db.collection(collection);
      if (where) {
        query = query.where(where);
      }
      const result = await query.count();
      return result.total || 0;
    } catch (error: any) {
      console.error(`统计文档数量失败 [${collection}]:`, error);
      throw new Error(`数据库统计失败: ${error.message}`);
    }
  }

  /**
   * 批量操作
   */
  async batch(operations: Array<{ type: 'add' | 'update' | 'delete'; collection: string; docId?: string; data?: any }>): Promise<void> {
    try {
      const batch = this.db.batch();
      
      for (const op of operations) {
        switch (op.type) {
          case 'add':
            batch.add(this.db.collection(op.collection).add({ data: op.data }));
            break;
          case 'update':
            if (op.docId) {
              batch.update(this.db.collection(op.collection).doc(op.docId), { data: op.data });
            }
            break;
          case 'delete':
            if (op.docId) {
              batch.delete(this.db.collection(op.collection).doc(op.docId));
            }
            break;
        }
      }

      await batch.commit();
    } catch (error: any) {
      console.error('批量操作失败:', error);
      throw new Error(`数据库批量操作失败: ${error.message}`);
    }
  }
}

/**
 * 创建数据库实例
 */
export function createDatabase(): Database {
  return new Database();
}

