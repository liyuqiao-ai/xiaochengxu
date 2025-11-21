/**
 * 创建订单云函数
 */

import { cloud } from 'wx-server-sdk';
import { Order } from '../../../shared/types/order';
import { validateOrder } from '../../../shared/utils/validation';
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
 * 发送通知
 */
async function sendNotification(params: {
  type: string;
  target: string | string[];
  data: any;
}) {
  // TODO: 实现通知发送逻辑
  console.log('发送通知:', params);
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { farmerId, jobType, pricingMode, demandInfo } = event;

  try {
    // 1. 参数验证
    if (!farmerId || !jobType || !pricingMode || !demandInfo) {
      return createInvalidParamsResponse('缺少必要参数');
    }

    // 2. 验证用户
    const farmer = await db.getDoc('users', farmerId);
    if (!farmer) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND);
    }
    if (farmer.role !== 'farmer') {
      return createErrorResponse(ErrorCode.USER_ROLE_MISMATCH, '用户不是农户');
    }

    // 3. 构建订单数据
    const orderData: Partial<Order> = {
      farmerId,
      jobType,
      pricingMode,
      status: 'pending',
      location: demandInfo.location,
      actualWorkload: {
        overtimeHours: 0,
      },
      timeline: {
        createdAt: new Date(),
      },
      ...demandInfo,
    };

    // 4. 验证订单数据
    const validation = validateOrder(orderData);
    if (!validation.valid) {
      return createErrorResponse(
        ErrorCode.ORDER_VALIDATION_FAILED,
        validation.errors.join(', ')
      );
    }

    // 5. 保存订单
    const orderId = await db.addDoc('orders', orderData);

    // 6. 发送通知给工头
    await sendNotification({
      type: 'new_demand',
      target: 'contractors',
      data: {
        orderId,
        jobType,
        pricingMode,
        location: demandInfo.location,
      },
    });

    return createSuccessResponse({ orderId });
  } catch (error: any) {
    console.error('创建订单失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};
