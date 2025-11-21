/**
 * 获取我的项目云函数
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

    // 检查角色：只有介绍方可以查看我的项目
    const roleCheck = requireRole(['introducer'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 查询介绍方关联的订单
    const orders = await db.queryDocs(
      'orders',
      { introducerId: context!.userId },
      {
        orderBy: { field: 'timeline.createdAt', order: 'desc' },
        limit: 50,
      }
    );

    // 3. 计算每个订单的佣金
    const projects = orders.map((order: any) => ({
      ...order,
      commission: order.financials?.introducerCommission || 0,
    }));

    return createSuccessResponse({ projects });
  } catch (error: any) {
    console.error('获取我的项目失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

