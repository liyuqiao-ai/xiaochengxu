/**
 * 更新订单状态云函数
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
import { OrderStatus } from '../../../shared/types/order';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 发送通知
 */
async function sendNotification(params: {
  type: string;
  target: string;
  data: any;
}) {
  // TODO: 实现通知发送逻辑
  console.log('发送通知:', params);
}

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
    const { orderId, targetStatus, reason } = event;
    if (!orderId || !targetStatus) {
      return createInvalidParamsResponse('缺少必要参数');
    }

    // 3. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    // 4. 权限检查
    const isFarmer = context!.userId === order.farmerId;
    const isContractor = context!.userId === order.contractorId;

    if (!isFarmer && !isContractor) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '无权操作此订单');
    }

    // 5. 验证状态转换
    if (!OrderStateMachine.canTransition(order.status, targetStatus as OrderStatus)) {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        `无法从状态 ${order.status} 转换到 ${targetStatus}`
      );
    }

    // 6. 执行状态转换
    const transitionResult = OrderStateMachine.transition(
      order.status,
      targetStatus as OrderStatus
    );
    if (!transitionResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, transitionResult.error);
    }

    // 7. 构建更新数据
    const updateData: any = {
      status: targetStatus,
    };

    // 根据目标状态更新时间轴
    switch (targetStatus) {
      case 'in_progress':
        updateData['timeline.startedAt'] = new Date();
        break;
      case 'completed':
        updateData['timeline.completedAt'] = new Date();
        break;
      case 'cancelled':
        updateData['timeline.cancelledAt'] = new Date();
        if (reason) {
          updateData.cancelReason = reason;
        }
        break;
    }

    // 8. 更新订单
    await db.updateDoc('orders', orderId, updateData);

    // 9. 发送通知
    const notifyTarget = isFarmer ? order.contractorId : order.farmerId;
    if (notifyTarget) {
      await sendNotification({
        type: 'order_status_changed',
        target: notifyTarget,
        data: {
          orderId,
          oldStatus: order.status,
          newStatus: targetStatus,
        },
      });
    }

    return createSuccessResponse({ orderId, status: targetStatus });
  } catch (error: any) {
    console.error('更新订单状态失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

