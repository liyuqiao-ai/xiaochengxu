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
 * 解析XML数据
 */
function parseXML(xmlData: string): Record<string, any> {
  const result: Record<string, any> = {};
  const regex = /<(\w+)>(.*?)<\/\1>/g;
  let match;
  while ((match = regex.exec(xmlData)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

/**
 * 生成XML响应
 */
function generateXML(returnCode: string, returnMsg: string): string {
  return `<xml>
<return_code><![CDATA[${returnCode}]]></return_code>
<return_msg><![CDATA[${returnMsg}]]></return_msg>
</xml>`;
}

/**
 * 验证微信支付回调签名
 */
function verifyCallbackSign(data: Record<string, any>, key: string): boolean {
  const sign = data.sign;
  if (!sign) {
    return false;
  }

  // 生成签名
  const sortedKeys = Object.keys(data).sort();
  const stringA = sortedKeys
    .filter((k) => data[k] && k !== 'sign')
    .map((k) => `${k}=${data[k]}`)
    .join('&');
  const stringSignTemp = `${stringA}&key=${key}`;

  const crypto = require('crypto');
  const calculatedSign = crypto
    .createHash('md5')
    .update(stringSignTemp)
    .digest('hex')
    .toUpperCase();

  return calculatedSign === sign;
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  try {
    // 1. 获取回调数据
    const xmlData = event.body || event.xml || event;

    if (!xmlData) {
      return generateXML('FAIL', '缺少回调数据');
    }

    // 2. 解析XML
    const callbackData = parseXML(xmlData);

    // 3. 验证签名
    const key = process.env.WX_PAY_KEY || '';
    if (!verifyCallbackSign(callbackData, key)) {
      console.error('签名验证失败:', callbackData);
      return generateXML('FAIL', '签名验证失败');
    }

    // 4. 检查支付结果
    if (callbackData.return_code !== 'SUCCESS' || callbackData.result_code !== 'SUCCESS') {
      return generateXML('FAIL', callbackData.err_code_des || '支付失败');
    }

    const { out_trade_no, transaction_id, total_fee } = callbackData;

    // 5. 查找支付记录
    const payments = await db.queryDocs('payments', { outTradeNo: out_trade_no });
    if (payments.length === 0) {
      console.error('支付记录不存在:', out_trade_no);
      return generateXML('FAIL', '支付记录不存在');
    }

    const payment = payments[0];

    // 6. 检查是否已处理（幂等性处理）
    if (payment.status === 'paid') {
      console.log('支付已处理，返回成功:', out_trade_no);
      return generateXML('SUCCESS', 'OK');
    }

    // 7. 验证金额
    if (parseInt(total_fee) !== payment.amount) {
      console.error('金额不匹配:', { total_fee, paymentAmount: payment.amount });
      return generateXML('FAIL', '金额不匹配');
    }

    // 8. 更新支付记录
    await db.updateDoc('payments', payment._id, {
      status: 'paid',
      transactionId: transaction_id,
      paidAt: new Date(),
    });

    // 9. 更新订单状态
    const order = await db.getDoc('orders', payment.orderId);
    if (order) {
      await db.updateDoc('orders', payment.orderId, {
        paymentStatus: 'paid',
        paymentTime: new Date(),
      });

      // 10. 触发自动分账
      if (order.financials) {
        try {
          await cloud.callFunction({
            name: 'executeSettlement',
            data: {
              orderId: order._id,
              paymentId: payment._id,
            },
          });
          console.log('自动分账成功:', order._id);
        } catch (error) {
          console.error('自动分账失败:', error);
          // 分账失败不影响支付成功，记录错误即可
        }
      }
    }

    // 11. 返回成功响应
    return generateXML('SUCCESS', 'OK');
  } catch (error: any) {
    console.error('支付回调处理失败:', error);
    return generateXML('FAIL', error.message || '处理失败');
  }
};
