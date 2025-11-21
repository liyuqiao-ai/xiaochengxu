/**
 * 微信支付回调处理云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 验证微信支付回调签名
 */
function verifyCallbackSign(xmlData: string, key: string): boolean {
  // TODO: 解析XML并验证签名
  // 实际应该解析XML，提取参数，验证签名
  return true;
}

/**
 * 解析XML数据
 */
function parseXML(xmlData: string): Record<string, any> {
  // TODO: 使用XML解析库解析
  // 这里返回模拟数据
  return {
    return_code: 'SUCCESS',
    result_code: 'SUCCESS',
    out_trade_no: '',
    transaction_id: '',
    total_fee: 0,
  };
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  try {
    // 1. 获取回调数据
    const xmlData = event.body || event.xml;

    if (!xmlData) {
      return {
        return_code: 'FAIL',
        return_msg: '缺少回调数据',
      };
    }

    // 2. 验证签名
    const key = process.env.WX_PAY_KEY || '';
    if (!verifyCallbackSign(xmlData, key)) {
      return {
        return_code: 'FAIL',
        return_msg: '签名验证失败',
      };
    }

    // 3. 解析XML
    const callbackData = parseXML(xmlData);

    // 4. 检查支付结果
    if (callbackData.return_code !== 'SUCCESS' || callbackData.result_code !== 'SUCCESS') {
      return {
        return_code: 'FAIL',
        return_msg: '支付失败',
      };
    }

    const { out_trade_no, transaction_id, total_fee } = callbackData;

    // 5. 查找支付记录
    const payments = await db.queryDocs('payments', { outTradeNo: out_trade_no });
    if (payments.length === 0) {
      return {
        return_code: 'FAIL',
        return_msg: '支付记录不存在',
      };
    }

    const payment = payments[0];

    // 6. 检查是否已处理
    if (payment.status === 'paid') {
      return {
        return_code: 'SUCCESS',
        return_msg: 'OK',
      };
    }

    // 7. 更新支付记录
    await db.updateDoc('payments', payment._id, {
      status: 'paid',
      transactionId: transaction_id,
      paidAt: new Date(),
    });

    // 8. 更新订单状态
    const order = await db.getDoc('orders', payment.orderId);
    if (order) {
      await db.updateDoc('orders', payment.orderId, {
        paymentStatus: 'paid',
        paymentTime: new Date(),
      });

      // 9. 触发自动分账
      if (order.financials) {
        // TODO: 实现自动分账逻辑
        console.log('触发自动分账:', {
          orderId: order._id,
          financials: order.financials,
        });
      }
    }

    // 10. 返回成功响应
    return {
      return_code: 'SUCCESS',
      return_msg: 'OK',
    };
  } catch (error: any) {
    console.error('支付回调处理失败:', error);
    return {
      return_code: 'FAIL',
      return_msg: error.message || '处理失败',
    };
  }
};

