/**
 * 取消订单云函数
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
import { OrderStateMachine } from '../../../shared/utils/orderStateMachine';

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
    const { orderId, reason } = event;
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }

    // 3. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    // 4. 权限检查：只有农户或工头可以取消订单
    const isFarmer = context!.userId === order.farmerId;
    const isContractor = context!.userId === order.contractorId;

    if (!isFarmer && !isContractor) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '无权取消此订单');
    }

    // 5. 检查是否可以取消
    if (!OrderStateMachine.canCancel(order.status)) {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        `订单状态为 ${order.status}，无法取消`
      );
    }

    // 6. 执行状态转换
    const transitionResult = OrderStateMachine.transition(order.status, 'cancelled');
    if (!transitionResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, transitionResult.error);
    }

    // 7. 更新订单状态
    await db.updateDoc('orders', orderId, {
      status: 'cancelled',
      cancelReason: reason || '用户取消',
      cancelledBy: context!.userId,
      cancelledAt: new Date(),
      'timeline.cancelledAt': new Date(),
    });

    // 8. 发送通知
    // TODO: 发送取消通知给相关方

    return createSuccessResponse({ orderId });
  } catch (error: any) {
    console.error('取消订单失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

