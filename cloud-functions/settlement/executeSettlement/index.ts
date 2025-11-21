/**
 * 执行结算分账云函数
 */

import { cloud } from 'wx-server-sdk';
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
 * 微信支付分账
 */
async function profitSharing(params: {
  transaction_id: string;
  out_order_no: string;
  receivers: Array<{
    type: string;
    account: string;
    amount: number;
    description: string;
  }>;
}): Promise<any> {
  // TODO: 调用微信支付分账API
  // 实际应该调用微信支付的分账接口
  console.log('执行分账:', params);
  return { success: true };
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  try {
    // 1. 参数验证
    const { orderId, paymentId } = event;
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }

    // 2. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    if (!order.financials) {
      return createErrorResponse(ErrorCode.PAYMENT_CALCULATION_FAILED, '订单财务信息未计算');
    }

    // 3. 获取支付记录
    let payment: any = null;
    if (paymentId) {
      payment = await db.getDoc('payments', paymentId);
    } else {
      const payments = await db.queryDocs('payments', { orderId, status: 'paid' });
      if (payments.length > 0) {
        payment = payments[0];
      }
    }

    if (!payment || payment.status !== 'paid') {
      return createErrorResponse(ErrorCode.PAYMENT_FAILED, '支付未完成');
    }

    // 4. 检查是否已分账
    const existingSettlement = await db.queryDocs('settlements', { orderId });
    if (existingSettlement.length > 0) {
      return createSuccessResponse({
        message: '已分账',
        settlement: existingSettlement[0],
      });
    }

    // 5. 构建分账信息
    const financials = order.financials;
    const receivers = [];

    // 工头收入
    if (order.contractorId && financials.contractorIncome > 0) {
      receivers.push({
        type: 'MERCHANT_ID',
        account: order.contractorId, // 实际应该是工头的商户号或openid
        amount: financials.contractorIncome,
        description: '工头劳务费',
      });
    }

    // 介绍方佣金
    if (order.introducerId && financials.introducerCommission > 0) {
      receivers.push({
        type: 'MERCHANT_ID',
        account: order.introducerId, // 实际应该是介绍方的商户号或openid
        amount: financials.introducerCommission,
        description: '介绍方佣金',
      });
    }

    // 6. 执行分账
    if (receivers.length > 0) {
      const settlementResult = await profitSharing({
        transaction_id: payment.transactionId,
        out_order_no: `SETTLEMENT_${orderId}_${Date.now()}`,
        receivers,
      });

      if (!settlementResult.success) {
        return createErrorResponse(ErrorCode.SETTLEMENT_FAILED, '分账失败');
      }
    }

    // 7. 保存结算记录
    const settlementId = await db.addDoc('settlements', {
      orderId,
      paymentId: payment._id,
      contractorId: order.contractorId,
      introducerId: order.introducerId,
      contractorAmount: financials.contractorIncome,
      introducerAmount: financials.introducerCommission,
      platformFee: financials.platformFee,
      status: 'completed',
      settledAt: new Date(),
    });

    // 8. 更新订单结算状态
    await db.updateDoc('orders', orderId, {
      settlementStatus: 'completed',
      settlementId,
    });

    return createSuccessResponse({
      settlementId,
      message: '分账成功',
    });
  } catch (error: any) {
    console.error('执行结算失败:', error);
    return createErrorResponse(ErrorCode.SETTLEMENT_FAILED, undefined, error.message);
  }
};

