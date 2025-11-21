/**
 * 获取待报价订单云函数
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

    // 检查角色：只有工头可以查看待报价订单
    const roleCheck = requireRole(['contractor'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 查询待报价订单（状态为pending的订单）
    const orders = await db.queryDocs(
      'orders',
      { status: 'pending' },
      {
        orderBy: { field: 'timeline.createdAt', order: 'desc' },
        limit: 50,
      }
    );

    return createSuccessResponse({ orders });
  } catch (error: any) {
    console.error('获取待报价订单失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

