/**
 * 接受报价云函数（农户接受工头报价）
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware, requireRole } from '../../../shared/middleware/auth';
import { OrderStateMachine } from '../../../shared/utils/orderStateMachine';

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
    // 1. 认证和权限检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 检查角色：只有农户可以接受报价
    const roleCheck = requireRole(['farmer'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

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

    // 4. 权限检查：只有订单的农户可以接受报价
    if (order.farmerId !== context!.userId) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '无权操作此订单');
    }

    // 5. 检查订单状态
    if (order.status !== 'quoted') {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        '订单状态不允许接受报价'
      );
    }

    // 6. 执行状态转换
    const transitionResult = OrderStateMachine.transition(order.status, 'confirmed');
    if (!transitionResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, transitionResult.error);
    }

    // 7. 更新订单状态
    await db.updateDoc('orders', orderId, {
      status: 'confirmed',
      'timeline.confirmedAt': new Date(),
    });

    // 8. 通知工头
    if (order.contractorId) {
      await sendNotification({
        type: 'quote_accepted',
        target: order.contractorId,
        data: {
          orderId,
          farmerName: context!.nickName || '农户',
        },
      });
    }

    return createSuccessResponse({ orderId });
  } catch (error: any) {
    console.error('接受报价失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

