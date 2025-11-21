/**
 * 获取我的订单云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware } from '../../../shared/middleware/auth';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 主函数
 */
export const main = async (event: any) => {
  try {
    // 1. 认证检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 2. 根据用户角色查询订单
    let orders: any[] = [];

    if (context!.role === 'contractor') {
      // 工头：查询我接的订单
      orders = await db.queryDocs(
        'orders',
        { contractorId: context!.userId },
        {
          orderBy: { field: 'timeline.createdAt', order: 'desc' },
          limit: 50,
        }
      );
    } else if (context!.role === 'farmer') {
      // 农户：查询我发布的订单
      orders = await db.queryDocs(
        'orders',
        { farmerId: context!.userId },
        {
          orderBy: { field: 'timeline.createdAt', order: 'desc' },
          limit: 50,
        }
      );
    } else {
      return createErrorResponse(ErrorCode.USER_ROLE_MISMATCH, '不支持的角色');
    }

    return createSuccessResponse({ orders });
  } catch (error: any) {
    console.error('获取我的订单失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

