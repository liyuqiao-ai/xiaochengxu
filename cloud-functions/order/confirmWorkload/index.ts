/**
 * 确认工作量云函数
 */

import { cloud } from 'wx-server-sdk';
import { PricingEngine } from '../../../shared/utils/pricing';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 触发结算
 */
async function triggerSettlement(orderId: string, payment: any) {
  // TODO: 实现结算逻辑
  console.log('触发结算:', { orderId, payment });
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { orderId, actualWorkload, confirmedBy } = event;

  try {
    // 1. 参数验证
    if (!orderId || !actualWorkload || !confirmedBy) {
      return { success: false, error: '缺少必要参数' };
    }

    if (!['farmer', 'contractor'].includes(confirmedBy)) {
      return { success: false, error: '无效的确认方' };
    }

    // 2. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    // 3. 更新实际工作量
    const updateData: any = {
      actualWorkload: {
        ...order.actualWorkload,
        ...actualWorkload,
      },
    };

    // 4. 标记确认状态
    if (confirmedBy === 'farmer') {
      updateData.confirmedByFarmer = true;
    } else {
      updateData.confirmedByContractor = true;
    }

    // 5. 检查是否双方都确认
    const bothConfirmed =
      (updateData.confirmedByFarmer || order.confirmedByFarmer) &&
      (updateData.confirmedByContractor || order.confirmedByContractor);

    if (bothConfirmed) {
      // 计算费用并更新订单
      const updatedOrder = {
        ...order,
        actualWorkload: {
          ...order.actualWorkload,
          ...actualWorkload,
        },
      };

      const payment = PricingEngine.calculateOrderPayment(updatedOrder as any);
      updateData.financials = payment;
      updateData.status = 'completed';
      updateData['timeline.completedAt'] = new Date();

      // 触发自动分账（如果已支付）
      const payments = await db.queryDocs('payments', { orderId, status: 'paid' });
      if (payments.length > 0) {
        try {
          await cloud.callFunction({
            name: 'executeSettlement',
            data: {
              orderId,
              paymentId: payments[0]._id,
            },
          });
        } catch (error) {
          console.error('自动分账失败:', error);
        }
      }
    }

    // 6. 更新订单
    await db.updateDoc('orders', orderId, updateData);

    return createSuccessResponse({ bothConfirmed });
  } catch (error: any) {
    console.error('确认工作量失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

