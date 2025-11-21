/**
 * 取消订单云函数
 * 状态转换：pending/quoted/confirmed → cancelled
 */

import { cloud } from 'wx-server-sdk';
import { Order, OrderStatus } from '../../../shared/types/order';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware } from '../../../shared/middleware/auth';
import { OrderStateMachine } from '../../../shared/utils/orderStateMachine';
import { validateId, sanitizeString } from '../../../shared/utils/inputValidation';
import { optimisticUpdate } from '../../../shared/utils/transaction';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 云函数事件参数
 */
interface CancelOrderEvent {
  orderId: string;
  reason?: string; // 取消原因
  token?: string;
}

/**
 * 主函数
 */
export const main = async (event: CancelOrderEvent) => {
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

    if (!validateId(orderId)) {
      return createInvalidParamsResponse('订单ID格式无效');
    }

    // 验证取消原因（如果提供）
    const sanitizedReason = reason ? sanitizeString(reason, 200) : '用户取消';

    // 3. 获取订单
    const order = await db.getDoc('orders', orderId) as Order | null;
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
    if (!OrderStateMachine.canCancel(order.status as OrderStatus)) {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        `订单状态为 ${order.status}，无法取消。只有待报价、已报价或已确认的订单可以取消。`
      );
    }

    // 6. 执行状态转换验证
    const transitionResult = OrderStateMachine.transition(order.status as OrderStatus, 'cancelled');
    if (!transitionResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, transitionResult.error);
    }

    // 8. 使用乐观锁原子性更新订单状态
    const { optimisticUpdate } = await import('../../../shared/utils/transaction');
    const updateResult = await optimisticUpdate(
      'orders',
      orderId,
      (currentOrder: any) => {
        // 再次验证状态（防止并发修改）
        if (!OrderStateMachine.canCancel(currentOrder.status)) {
          throw new Error('订单状态已变更，无法取消');
        }

        // 验证权限（再次检查）
        const isFarmer = currentOrder.farmerId === context!.userId;
        const isContractor = currentOrder.contractorId === context!.userId;
        if (!isFarmer && !isContractor) {
          throw new Error('无权取消此订单');
        }

        return {
          status: 'cancelled' as OrderStatus,
          cancelReason: sanitizedReason,
          cancelledBy: context!.userId,
          cancelledAt: new Date(),
          'timeline.cancelledAt': new Date(),
        };
      }
    );

    if (!updateResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, updateResult.error);
    }

    // 9. 发送取消通知给相关方
    try {
      const notificationTargets: string[] = [];
      
      // 通知农户（如果不是农户取消的）
      if (order.farmerId !== context!.userId) {
        notificationTargets.push(order.farmerId);
      }
      
      // 通知工头（如果存在且不是工头取消的）
      if (order.contractorId && order.contractorId !== context!.userId) {
        notificationTargets.push(order.contractorId);
      }

      // 批量发送通知
      for (const target of notificationTargets) {
        try {
          await cloud.callFunction({
            name: 'sendNotification',
            data: {
              type: 'order_cancelled',
              target,
              data: {
                orderId,
                cancelledBy: context!.nickName || '用户',
                reason: sanitizedReason,
              },
            },
          });
        } catch (notifyError) {
          console.error(`发送通知给 ${target} 失败:`, notifyError);
        }
      }
    } catch (notifyError) {
      // 通知失败不影响业务逻辑
      console.error('发送取消通知失败:', notifyError);
    }

    return createSuccessResponse({ orderId, status: 'cancelled' });
  } catch (error: any) {
    console.error('取消订单失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

