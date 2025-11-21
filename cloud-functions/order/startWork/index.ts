/**
 * 开始工作云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import { OrderStateMachine } from '../../../shared/utils/orderStateMachine';
import { authMiddleware, validateOrderAccess } from '../../../shared/middleware/auth';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = createDatabase();

export const main = async (event: any) => {
  const { orderId } = event;

  try {
    // 1. 参数验证
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }

    // 2. 认证检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 3. 验证订单访问权限
    const accessResult = await validateOrderAccess(context!.userId, orderId);
    if (!accessResult.success) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND, accessResult.error);
    }

    const order = accessResult.order;

    // 4. 验证订单状态
    if (order.status !== 'confirmed') {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        `订单状态为 ${order.status}，无法开始工作`
      );
    }

    // 5. 验证状态转换
    if (!OrderStateMachine.canStart(order.status)) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, '订单状态不允许开始工作');
    }

    // 6. 执行状态转换
    const transitionResult = OrderStateMachine.transition(order.status, 'in_progress');
    if (!transitionResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, transitionResult.error);
    }

    // 7. 更新订单状态
    await db.updateDoc('orders', orderId, {
      status: 'in_progress',
      'timeline.startedAt': new Date(),
    });

    // 8. 发送通知
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'work_started',
          target: order.farmerId,
          data: { orderId },
        },
      });
    } catch (notifyError) {
      console.error('发送通知失败:', notifyError);
    }

    return createSuccessResponse({ orderId, status: 'in_progress' });
  } catch (error: any) {
    console.error('开始工作失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

