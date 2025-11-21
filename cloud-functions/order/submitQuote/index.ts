/**
 * 提交报价云函数
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
import { isValidStatusTransition } from '../../../shared/utils/validation';

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
  try {
    // 调用通知云函数
    await cloud.callFunction({
      name: 'sendNotification',
      data: params,
    });
  } catch (error) {
    console.error('发送通知失败:', error);
    // 通知失败不影响主流程，只记录错误
  }
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

    // 检查角色：只有工头可以报价
    const roleCheck = requireRole(['contractor'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 参数验证
    const { orderId, quotePrice } = event;
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }
    if (quotePrice === undefined || quotePrice === null) {
      return createInvalidParamsResponse('缺少报价金额');
    }
    if (quotePrice <= 0) {
      return createInvalidParamsResponse('报价金额必须大于0');
    }

    // 使用认证上下文中的userId作为contractorId
    const contractorId = context!.userId;

    // 3. 验证订单状态：pending → quoted
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    // 状态验证：必须是 pending 状态才能报价
    if (order.status !== 'pending') {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        `订单状态为 ${order.status}，无法报价。只有待报价状态的订单可以报价。`
      );
    }

    // 使用状态机双重验证：检查是否可以报价
    if (!OrderStateMachine.canQuote(order.status)) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, '订单已接单或已取消');
    }

    // 使用状态转换验证：pending → quoted 是否合法
    if (!isValidStatusTransition(order.status, 'quoted')) {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        `无法从状态 ${order.status} 转换到 quoted`
      );
    }

    // 4. 验证工头资质
    const contractor = await db.getDoc('users', contractorId);
    if (!contractor) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND, '工头不存在');
    }

    // 验证角色
    if (contractor.role !== 'contractor') {
      return createErrorResponse(ErrorCode.USER_ROLE_MISMATCH, '用户不是工头');
    }

    // 验证认证状态：必须是已认证的工头才能报价
    if (!contractor.certification || contractor.certification.status !== 'approved') {
      return createErrorResponse(
        ErrorCode.USER_NOT_VERIFIED,
        '工头未认证或认证未通过，无法报价'
      );
    }

    // 验证工头状态：必须是激活状态
    if (contractor.status !== 'active') {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '工头账号未激活');
    }

    // 5. 更新报价信息
    const updateData: any = {
      contractorId,
      status: 'quoted',
      'timeline.quotedAt': new Date(),
    };

    // 根据计价模式设置单价
    switch (order.pricingMode) {
      case 'piece':
        updateData['pieceInfo.unitPrice'] = quotePrice;
        break;
      case 'daily':
        updateData['dailyInfo.dailySalary'] = quotePrice;
        break;
      case 'monthly':
        updateData['monthlyInfo.monthlySalary'] = quotePrice;
        break;
      default:
        return createErrorResponse(ErrorCode.INVALID_PARAMS, '不支持的计价模式');
    }

    // 执行状态转换
    const transitionResult = OrderStateMachine.transition(order.status, 'quoted');
    if (!transitionResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, transitionResult.error);
    }

    await db.updateDoc('orders', orderId, updateData);

    // 6. 通知农户
    await sendNotification({
      type: 'new_quote',
      target: order.farmerId,
      data: {
        orderId,
        contractorName: contractor.nickName,
        quotePrice,
      },
    });

    return createSuccessResponse({
      orderId,
      status: 'quoted',
      message: '报价提交成功',
    });
  } catch (error: any) {
    console.error('提交报价失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

