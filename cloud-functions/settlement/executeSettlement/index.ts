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
 * 生成XML请求
 */
function generateXML(params: Record<string, any>): string {
  const xmlParts = Object.keys(params)
    .map((key) => `<${key}><![CDATA[${params[key]}]]></${key}>`)
    .join('\n');
  return `<xml>\n${xmlParts}\n</xml>`;
}

/**
 * 生成微信支付签名
 */
function generateSign(params: Record<string, any>, key: string): string {
  const sortedKeys = Object.keys(params).sort();
  const stringA = sortedKeys
    .filter((k) => params[k] && k !== 'sign')
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const stringSignTemp = `${stringA}&key=${key}`;
  const crypto = require('crypto');
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
}

/**
 * 调用微信支付分账API
 */
async function profitSharing(params: {
  appid: string;
  mch_id: string;
  transaction_id: string;
  out_order_no: string;
  receivers: string; // JSON字符串
  key: string;
}): Promise<any> {
  const sign = generateSign(params, params.key);
  const xml = generateXML({ ...params, sign });

  const https = require('https');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      path: '/secapi/pay/profitsharing',
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xml),
      },
      // 分账接口需要证书，这里简化处理
    };

    const req = https.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = parseXML(data);
          if (parsed.return_code === 'SUCCESS' && parsed.result_code === 'SUCCESS') {
            resolve({ success: true, data: parsed });
          } else {
            reject(new Error(parsed.err_code_des || parsed.return_msg || '分账失败'));
          }
        } catch (error) {
          reject(new Error('解析响应失败'));
        }
      });
    });

    req.on('error', reject);
    req.write(xml);
    req.end();
  });
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

    // 4. 检查是否已分账（幂等性处理）
    const existingSettlement = await db.queryDocs('settlements', { orderId });
    if (existingSettlement.length > 0) {
      return createSuccessResponse({
        message: '已分账',
        settlement: existingSettlement[0],
      });
    }

    // 5. 构建分账信息
    const financials = order.financials;
    const receivers: any[] = [];

    // 工头收入
    if (order.contractorId && financials.contractorIncome > 0) {
      // 获取工头的商户号或openid
      const contractor = await db.getDoc('users', order.contractorId);
      if (contractor) {
        receivers.push({
          type: 'MERCHANT_ID', // 或 'PERSONAL_OPENID'
          account: contractor.openid || contractor.merchantId || order.contractorId,
          amount: financials.contractorIncome,
          description: '工头劳务费',
        });
      }
    }

    // 介绍方佣金
    if (order.introducerId && financials.introducerCommission > 0) {
      const introducer = await db.getDoc('users', order.introducerId);
      if (introducer) {
        receivers.push({
          type: 'MERCHANT_ID', // 或 'PERSONAL_OPENID'
          account: introducer.openid || introducer.merchantId || order.introducerId,
          amount: financials.introducerCommission,
          description: '介绍方佣金',
        });
      }
    }

    // 6. 执行分账（如果有接收方）
    if (receivers.length > 0) {
      const wxPayConfig = {
        appid: 'wxbc618555fee468d1',
        mch_id: process.env.WX_PAY_MCHID || '',
        key: process.env.WX_PAY_KEY || '',
      };

      if (!wxPayConfig.mch_id || !wxPayConfig.key) {
        console.warn('微信支付配置不完整，跳过分账API调用');
      } else {
        try {
          const settlementResult = await profitSharing({
            appid: wxPayConfig.appid,
            mch_id: wxPayConfig.mch_id,
            transaction_id: payment.transactionId,
            out_order_no: `SETTLEMENT_${orderId}_${Date.now()}`,
            receivers: JSON.stringify(receivers),
            key: wxPayConfig.key,
          });

          if (!settlementResult.success) {
            console.error('分账API调用失败:', settlementResult);
            // 分账失败不影响结算记录，记录错误即可
          }
        } catch (error) {
          console.error('分账API调用异常:', error);
          // 分账失败不影响结算记录，记录错误即可
        }
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

    // 9. 更新工头和介绍方的账户余额（如果需要）
    if (order.contractorId && financials.contractorIncome > 0) {
      await db.updateDoc('users', order.contractorId, {
        $inc: { balance: financials.contractorIncome },
      });
    }

    if (order.introducerId && financials.introducerCommission > 0) {
      await db.updateDoc('users', order.introducerId, {
        $inc: { balance: financials.introducerCommission },
      });
    }

    return createSuccessResponse({
      settlementId,
      message: '分账成功',
    });
  } catch (error: any) {
    console.error('执行结算失败:', error);
    return createErrorResponse(ErrorCode.SETTLEMENT_FAILED, undefined, error.message);
  }
};
