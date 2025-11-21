/**
 * 获取订单详情云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
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

    // 2. 参数验证
    const { orderId } = event;
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }

    // 3. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    // 4. 权限检查：只有订单相关的用户才能查看
    const isFarmer = context!.userId === order.farmerId;
    const isContractor = context!.userId === order.contractorId;

    if (!isFarmer && !isContractor) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '无权查看此订单');
    }

    return createSuccessResponse({ order });
  } catch (error: any) {
    console.error('获取订单详情失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

