/**
 * 获取附近任务云函数
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

    // 检查角色：只有工人可以查看附近任务
    const roleCheck = requireRole(['worker'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 获取用户位置（从参数或用户信息中获取）
    const { latitude, longitude } = event;
    
    // 3. 查询进行中的订单（这些是工人可以加入的任务）
    const orders = await db.queryDocs(
      'orders',
      { status: 'in_progress' },
      {
        orderBy: { field: 'timeline.createdAt', order: 'desc' },
        limit: 50,
      }
    );

    // TODO: 根据地理位置筛选附近的任务
    // 这里简化处理，返回所有进行中的订单

    return createSuccessResponse({ tasks: orders });
  } catch (error: any) {
    console.error('获取附近任务失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

