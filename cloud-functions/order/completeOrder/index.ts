/**
 * 完成订单云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import { OrderStateMachine } from '../../../shared/utils/orderStateMachine';
import { PricingEngine } from '../../settlement/calculatePayment/index';
import { authMiddleware, validateOrderAccess } from '../../../shared/middleware/auth';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = createDatabase();

import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

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
    if (order.status !== 'in_progress') {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        `订单状态为 ${order.status}，无法完成订单`
      );
    }

    // 5. 验证状态转换
    if (!OrderStateMachine.canComplete(order.status)) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, '订单状态不允许完成');
    }

    // 6. 计算费用（如果还没有计算）
    if (!order.financials) {
      const payment = PricingEngine.calculateOrderPayment(order);
      await db.updateDoc('orders', orderId, { financials: payment });
      order.financials = payment;
    }

    // 7. 执行状态转换
    const transitionResult = OrderStateMachine.transition(order.status, 'completed');
    if (!transitionResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, transitionResult.error);
    }

    // 8. 更新订单状态
    await db.updateDoc('orders', orderId, {
      status: 'completed',
      'timeline.completedAt': new Date(),
    });

    // 9. 发送通知给双方
    try {
      // 通知农户
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'work_completed',
          target: order.farmerId,
          data: { orderId },
        },
      });

      // 通知工头
      if (order.contractorId) {
        await cloud.callFunction({
          name: 'sendNotification',
          data: {
            type: 'work_completed',
            target: order.contractorId,
            data: { orderId },
          },
        });
      }
    } catch (notifyError) {
      console.error('发送通知失败:', notifyError);
    }

    return createSuccessResponse({ orderId, status: 'completed' });
  } catch (error: any) {
    console.error('完成订单失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

