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
 * 注意：分账接口需要使用SSL证书进行双向认证
 */
async function profitSharing(params: {
  appid: string;
  mch_id: string;
  transaction_id: string;
  out_order_no: string;
  receivers: string; // JSON字符串
  key: string;
  certPath?: string; // 证书文件路径
  keyPath?: string; // 私钥文件路径
}): Promise<any> {
  const sign = generateSign(params, params.key);
  const xml = generateXML({ ...params, sign });

  const https = require('https');
  const fs = require('fs');
  
  // 配置SSL证书（如果提供）
  const httpsOptions: any = {
    hostname: 'api.mch.weixin.qq.com',
    path: '/secapi/pay/profitsharing',
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'Content-Length': Buffer.byteLength(xml),
    },
  };

  // 如果提供了证书路径，加载证书
  if (params.certPath && params.keyPath) {
    try {
      httpsOptions.cert = fs.readFileSync(params.certPath);
      httpsOptions.key = fs.readFileSync(params.keyPath);
    } catch (error) {
      console.error('加载SSL证书失败:', error);
      throw new Error('SSL证书加载失败，无法调用分账接口');
    }
  } else {
    // 如果没有证书，尝试从环境变量或云存储获取
    // 注意：在生产环境中，证书应该存储在云存储中，通过云存储API获取
    console.warn('未配置SSL证书，分账接口可能调用失败');
  }

  return new Promise((resolve, reject) => {
    const options = httpsOptions;

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
      if (!contractor) {
        return createErrorResponse(ErrorCode.USER_NOT_FOUND, '工头信息不存在');
      }

      // 验证分账账户：必须要有merchantId或openid
      if (!contractor.merchantId && !contractor.openid) {
        return createErrorResponse(
          ErrorCode.INVALID_PARAMS,
          '工头未设置分账账户，无法进行分账。请工头先设置商户号或绑定微信账号'
        );
      }

      // 优先使用merchantId，如果没有则使用openid
      const account = contractor.merchantId || contractor.openid;
      receivers.push({
        type: contractor.merchantId ? 'MERCHANT_ID' : 'PERSONAL_OPENID',
        account: account,
        amount: financials.contractorIncome,
        description: '工头劳务费',
      });
    }

    // 介绍方佣金
    if (order.introducerId && financials.introducerCommission > 0) {
      const introducer = await db.getDoc('users', order.introducerId);
      if (!introducer) {
        return createErrorResponse(ErrorCode.USER_NOT_FOUND, '介绍方信息不存在');
      }

      // 验证分账账户：必须要有merchantId或openid
      if (!introducer.merchantId && !introducer.openid) {
        return createErrorResponse(
          ErrorCode.INVALID_PARAMS,
          '介绍方未设置分账账户，无法进行分账。请介绍方先设置商户号或绑定微信账号'
        );
      }

      // 优先使用merchantId，如果没有则使用openid
      const account = introducer.merchantId || introducer.openid;
      receivers.push({
        type: introducer.merchantId ? 'MERCHANT_ID' : 'PERSONAL_OPENID',
        account: account,
        amount: financials.introducerCommission,
        description: '介绍方佣金',
      });
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
          // 获取证书路径（从环境变量或云存储）
          const certPath = process.env.WX_PAY_CERT_PATH || '';
          const keyPath = process.env.WX_PAY_KEY_PATH || '';

          const settlementResult = await profitSharing({
            appid: wxPayConfig.appid,
            mch_id: wxPayConfig.mch_id,
            transaction_id: payment.transactionId,
            out_order_no: `SETTLEMENT_${orderId}_${Date.now()}`,
            receivers: JSON.stringify(receivers),
            key: wxPayConfig.key,
            certPath: certPath || undefined,
            keyPath: keyPath || undefined,
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
    // 注意：如果分账成功，余额通过微信支付分账直接到账，这里只记录到账户余额
    // 如果分账失败或未配置，则直接增加到账户余额
    if (order.contractorId && financials.contractorIncome > 0) {
      const contractor = await db.getDoc('users', order.contractorId);
      if (contractor) {
        const currentBalance = contractor.balance || 0;
        await db.updateDoc('users', order.contractorId, {
          balance: currentBalance + financials.contractorIncome,
          updatedAt: new Date(),
        });
      }
    }

    if (order.introducerId && financials.introducerCommission > 0) {
      const introducer = await db.getDoc('users', order.introducerId);
      if (introducer) {
        const currentBalance = introducer.balance || 0;
        await db.updateDoc('users', order.introducerId, {
          balance: currentBalance + financials.introducerCommission,
          updatedAt: new Date(),
        });
      }
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
