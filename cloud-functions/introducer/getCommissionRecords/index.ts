/**
 * 获取佣金记录云函数
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

    // 检查角色：只有介绍方可以查看佣金记录
    const roleCheck = requireRole(['introducer'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 查询结算记录（包含介绍方佣金的）
    const settlements = await db.queryDocs(
      'settlements',
      { introducerId: context!.userId },
      {
        orderBy: { field: 'settledAt', order: 'desc' },
        limit: 50,
      }
    );

    // 3. 转换为佣金记录格式
    const records = settlements.map((settlement: any) => ({
      _id: settlement._id,
      type: '订单佣金',
      amount: settlement.introducerAmount || 0,
      orderId: settlement.orderId,
      createdAt: settlement.settledAt,
    }));

    return createSuccessResponse({ records });
  } catch (error: any) {
    console.error('获取佣金记录失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

