/**
 * 计算支付金额云函数
 * 按照方案要求：PricingEngine类定义在此文件中
 */

import { cloud } from 'wx-server-sdk';
import { Order } from '../../../shared/types/order';
import { createDatabase } from '../../../shared/utils/db';
import { PricingEngine } from '../../../shared/utils/pricing';
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
 * 主函数
 */
export const main = async (event: any) => {
  const { orderId } = event;

  try {
    // 1. 参数验证
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }

    // 2. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    // 3. 计算支付金额
    const payment = PricingEngine.calculateOrderPayment(order as Order);

    return createSuccessResponse({ payment });
  } catch (error: any) {
    console.error('计算支付金额失败:', error);
    return createErrorResponse(
      ErrorCode.PAYMENT_CALCULATION_FAILED,
      undefined,
      error.message
    );
  }
};

// PricingEngine已移动到shared/utils/pricing.ts，不再从此文件导出
