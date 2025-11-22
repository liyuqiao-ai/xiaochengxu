/**
 * 创建支付订单（预下单）云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware } from '../../../shared/middleware/auth';
import { PricingEngine } from '../../../shared/utils/pricing';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 生成随机字符串
 */
function generateNonceStr(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成微信支付签名
 */
function generateSign(params: Record<string, any>, key: string): string {
  // 1. 参数排序
  const sortedKeys = Object.keys(params).sort();
  const stringA = sortedKeys
    .filter((k) => params[k] && k !== 'sign')
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  // 2. 拼接key
  const stringSignTemp = `${stringA}&key=${key}`;

  // 3. MD5加密并转大写
  const crypto = require('crypto');
  const sign = crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
  return sign;
}

/**
 * 解析XML响应
 */
function parseXML(xml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const regex = /<(\w+)>(.*?)<\/\1>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

/**
 * 调用微信支付统一下单API
 */
async function unifiedOrder(params: {
  appid: string;
  mch_id: string;
  nonce_str: string;
  body: string;
  out_trade_no: string;
  total_fee: number;
  spbill_create_ip: string;
  notify_url: string;
  trade_type: string;
  openid: string;
  key: string;
}): Promise<any> {
  // 生成签名
  const sign = generateSign(params, params.key);

  // 构建XML请求
  const xml = `<xml>
<appid>${params.appid}</appid>
<mch_id>${params.mch_id}</mch_id>
<nonce_str>${params.nonce_str}</nonce_str>
<body><![CDATA[${params.body}]]></body>
<out_trade_no>${params.out_trade_no}</out_trade_no>
<total_fee>${params.total_fee}</total_fee>
<spbill_create_ip>${params.spbill_create_ip}</spbill_create_ip>
<notify_url>${params.notify_url}</notify_url>
<trade_type>${params.trade_type}</trade_type>
<openid>${params.openid}</openid>
<sign>${sign}</sign>
</xml>`;

  // 调用微信支付API
  const https = require('https');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      path: '/pay/unifiedorder',
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xml),
      },
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
            resolve(parsed);
          } else {
            reject(new Error(parsed.err_code_des || parsed.return_msg || '统一下单失败'));
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
    // 1. 认证检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 2. 参数验证
    const { orderId } = event;
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }

    // 3. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    // 4. 检查订单状态和权限
    if (order.farmerId !== context!.userId) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '无权支付此订单');
    }

    // 4.1 检查订单状态
    if (order.status !== 'completed') {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        '订单状态不允许支付，请先完成订单'
      );
    }

    // 4.2 检查工作量是否已双方确认
    if (!order.confirmedByFarmer || !order.confirmedByContractor) {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        '工作量未确认，无法支付。请等待双方确认工作量'
      );
    }

    // 4.3 检查是否已支付
    const existingPayments = await db.queryDocs('payments', { orderId, status: 'paid' });
    if (existingPayments.length > 0) {
      return createErrorResponse(ErrorCode.PAYMENT_FAILED, '订单已支付');
    }

    // 5. 计算支付金额（如果还没有计算）
    if (!order.financials) {
      const payment = PricingEngine.calculateOrderPayment(order);
      await db.updateDoc('orders', orderId, { financials: payment });
      order.financials = payment;
    }

    // 6. 生成支付订单号
    const outTradeNo = `ORDER_${orderId}_${Date.now()}`;
    const nonceStr = generateNonceStr();

    // 7. 获取微信支付配置
    const wxPayConfig = {
      appid: 'wxbc618555fee468d1',
      mch_id: process.env.WX_PAY_MCHID || '',
      key: process.env.WX_PAY_KEY || '',
      notify_url:
        process.env.CLOUD_BASE_URL ||
        `https://cloud1-3g2i1jqra6ba039d.service.weixin.qq.com/payment/payCallback`,
    };

    if (!wxPayConfig.mch_id || !wxPayConfig.key) {
      return createErrorResponse(
        ErrorCode.PAYMENT_FAILED,
        '微信支付配置不完整，请联系管理员'
      );
    }

    // 8. 调用微信支付统一下单
    const unifiedOrderResult = await unifiedOrder({
      appid: wxPayConfig.appid,
      mch_id: wxPayConfig.mch_id,
      nonce_str: nonceStr,
      body: `农业零工-${order.jobType}`,
      out_trade_no: outTradeNo,
      total_fee: order.financials.totalAmount, // 金额单位：分
      spbill_create_ip: '127.0.0.1', // 实际应从请求中获取
      notify_url: wxPayConfig.notify_url,
      trade_type: 'JSAPI',
      openid: context!.openid,
      key: wxPayConfig.key,
    });

    // 9. 保存支付记录
    const paymentId = await db.addDoc('payments', {
      orderId,
      outTradeNo,
      amount: order.financials.totalAmount,
      status: 'pending',
      createdAt: new Date(),
    });

    // 10. 生成小程序支付参数
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const prepayId = unifiedOrderResult.prepay_id;

    const paymentParams = {
      timeStamp,
      nonceStr: nonceStr,
      package: `prepay_id=${prepayId}`,
      signType: 'MD5' as const,
      paySign: generateSign(
        {
          appId: wxPayConfig.appid,
          timeStamp,
          nonceStr: nonceStr,
          package: `prepay_id=${prepayId}`,
          signType: 'MD5',
        },
        wxPayConfig.key
      ),
    };

    return createSuccessResponse({
      paymentId,
      paymentParams,
    });
  } catch (error: any) {
    console.error('创建支付订单失败:', error);
    return createErrorResponse(ErrorCode.PAYMENT_FAILED, undefined, error.message);
  }
};
