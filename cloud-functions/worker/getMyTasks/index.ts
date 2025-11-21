/**
 * 获取我的任务云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware, requireRole } from '../../../shared/middleware/auth';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 主函数
 */
export const main = async (event: any) => {
  try {
    // 1. 认证和权限检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 检查角色：只有工人可以查看我的任务
    const roleCheck = requireRole(['worker'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 获取工人的工头
    const worker = await db.getDoc('users', context!.userId);
    if (!worker || !worker.contractorId) {
      return createSuccessResponse({ tasks: [] });
    }

    // 3. 查询工头负责的订单
    const orders = await db.queryDocs(
      'orders',
      { contractorId: worker.contractorId, status: 'in_progress' },
      {
        orderBy: { field: 'timeline.createdAt', order: 'desc' },
        limit: 50,
      }
    );

    return createSuccessResponse({ tasks: orders });
  } catch (error: any) {
    console.error('获取我的任务失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

