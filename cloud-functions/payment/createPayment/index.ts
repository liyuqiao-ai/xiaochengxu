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
  const xml = `
    <xml>
      <appid>${params.appid}</appid>
      <mch_id>${params.mch_id}</mch_id>
      <nonce_str>${params.nonce_str}</nonce_str>
      <body>${params.body}</body>
      <out_trade_no>${params.out_trade_no}</out_trade_no>
      <total_fee>${params.total_fee}</total_fee>
      <spbill_create_ip>${params.spbill_create_ip}</spbill_create_ip>
      <notify_url>${params.notify_url}</notify_url>
      <trade_type>${params.trade_type}</trade_type>
      <openid>${params.openid}</openid>
      <sign>${sign}</sign>
    </xml>
  `;

  // 调用微信支付API
  // 注意：实际环境中需要使用HTTPS请求
  // 这里使用云函数调用HTTP API
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
        // 解析XML响应
        // TODO: 使用XML解析库解析响应
        resolve(data);
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

    if (order.status !== 'confirmed' && order.status !== 'in_progress') {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        '订单状态不允许支付'
      );
    }

    // 5. 计算支付金额（如果还没有计算）
    if (!order.financials) {
      const { PricingEngine } = require('../../../shared/utils/pricing');
      const payment = PricingEngine.calculateOrderPayment(order);
      await db.updateDoc('orders', orderId, { financials: payment });
      order.financials = payment;
    }

    // 6. 生成支付订单号
    const outTradeNo = `ORDER_${orderId}_${Date.now()}`;
    const nonceStr = generateNonceStr();

    // 7. 调用微信支付统一下单
    const wxPayConfig = {
      appid: 'wxbc618555fee468d1',
      mch_id: process.env.WX_PAY_MCHID || '',
      key: process.env.WX_PAY_KEY || '',
      notify_url: `${process.env.CLOUD_BASE_URL}/payment/payCallback`,
    };

    const unifiedOrderResult = await unifiedOrder({
      appid: wxPayConfig.appid,
      mch_id: wxPayConfig.mch_id,
      nonce_str: nonceStr,
      body: `农业零工-${order.jobType}`,
      out_trade_no: outTradeNo,
      total_fee: order.financials.totalAmount,
      spbill_create_ip: '127.0.0.1', // 实际应从请求中获取
      notify_url: wxPayConfig.notify_url,
      trade_type: 'JSAPI',
      openid: context!.openid,
      key: wxPayConfig.key,
    });

    // 8. 保存支付记录
    const paymentId = await db.addDoc('payments', {
      orderId,
      outTradeNo,
      amount: order.financials.totalAmount,
      status: 'pending',
      createdAt: new Date(),
    });

    // 9. 返回支付参数（小程序端需要）
    // 实际应该解析unifiedOrderResult获取prepay_id
    // 然后生成小程序支付参数
    const paymentParams = {
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: nonceStr,
      package: `prepay_id=${unifiedOrderResult.prepay_id || 'mock_prepay_id'}`,
      signType: 'MD5',
      paySign: generateSign(
        {
          appId: wxPayConfig.appid,
          timeStamp: Math.floor(Date.now() / 1000).toString(),
          nonceStr: nonceStr,
          package: `prepay_id=${unifiedOrderResult.prepay_id || 'mock_prepay_id'}`,
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

