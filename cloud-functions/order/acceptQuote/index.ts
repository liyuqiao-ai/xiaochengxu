/**
 * 接受报价云函数（农户接受工头报价）
 * 状态转换：quoted → confirmed
 */

import { cloud } from 'wx-server-sdk';
import { Order, OrderStatus } from '../../../shared/types/order';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware, requireRole } from '../../../shared/middleware/auth';
import { OrderStateMachine } from '../../../shared/utils/orderStateMachine';
import { validateId } from '../../../shared/utils/inputValidation';
import { optimisticUpdate } from '../../../shared/utils/transaction';
import { createDatabase } from '../../../shared/utils/db';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 云函数事件参数
 */
interface AcceptQuoteEvent {
  orderId: string;
  token?: string;
}

/**
 * 主函数
 */
export const main = async (event: AcceptQuoteEvent) => {
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

    if (!validateId(orderId)) {
      return createInvalidParamsResponse('订单ID格式无效');
    }

    // 3. 获取订单
    const order = await db.getDoc('orders', orderId) as Order | null;
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

    // 6. 验证状态转换
    if (!OrderStateMachine.canConfirm(order.status as OrderStatus)) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, '订单状态不允许接受报价');
    }

    // 7. 执行状态转换验证
    const transitionResult = OrderStateMachine.transition(order.status as OrderStatus, 'confirmed');
    if (!transitionResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, transitionResult.error);
    }

    // 8. 使用乐观锁原子性更新订单状态
    const updateResult = await optimisticUpdate<Order>(
      'orders',
      orderId,
      (currentOrder: Order) => {
        // 再次验证状态（防止并发修改）
        if (currentOrder.status !== 'quoted') {
          throw new Error('订单状态已变更，无法接受报价');
        }
        if (currentOrder.contractorId !== order.contractorId) {
          throw new Error('订单工头已变更');
        }
        if (currentOrder.farmerId !== context!.userId) {
          throw new Error('无权操作此订单');
        }

        return {
          status: 'confirmed' as OrderStatus,
          'timeline.confirmedAt': new Date(),
        };
      }
    );

    if (!updateResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, updateResult.error);
    }

    // 9. 通知工头
    if (order.contractorId) {
      try {
        await cloud.callFunction({
          name: 'sendNotification',
          data: {
            type: 'quote_accepted',
            target: order.contractorId,
            data: {
              orderId,
              farmerName: context!.nickName || '农户',
            },
          },
        });
      } catch (notifyError) {
        // 通知失败不影响业务逻辑
        console.error('发送通知失败:', notifyError);
      }
    }

    return createSuccessResponse({
      orderId,
      status: 'confirmed',
      confirmedAt: new Date(),
    });
  } catch (error: any) {
    console.error('接受报价失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

