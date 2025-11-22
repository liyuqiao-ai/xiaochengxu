/**
 * 发送短信验证码云函数
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
 * 生成6位随机验证码
 */
function generateVerifyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { phone, type = 'login' } = event;

  try {
    // 1. 参数验证
    if (!phone) {
      return createInvalidParamsResponse('缺少手机号参数');
    }

    // 验证手机号格式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      return createErrorResponse(ErrorCode.INVALID_PARAMS, '手机号格式不正确');
    }

    // 2. 检查发送频率（防止频繁发送）
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    const recentCodes = await db
      .collection('sms_codes')
      .where({
        phone: phone,
        createdAt: db.command.gte(oneMinuteAgo),
      })
      .get();

    if (recentCodes.data.length > 0) {
      return createErrorResponse(ErrorCode.RATE_LIMIT, '发送过于频繁，请稍后再试');
    }

    // 3. 生成验证码
    const verifyCode = generateVerifyCode();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10分钟过期

    // 4. 保存验证码到数据库
    await db.collection('sms_codes').add({
      data: {
        phone: phone,
        code: verifyCode,
        type: type, // login, register, resetPassword 等
        expiresAt: expiresAt,
        createdAt: now,
        used: false,
      },
    });

    // 5. 发送短信（这里使用模拟发送，实际应该调用短信服务商API）
    // 注意：微信小程序云开发不直接支持发送短信，需要：
    // 1. 使用第三方短信服务（如阿里云、腾讯云SMS）
    // 2. 或者使用微信云开发的HTTP API调用外部服务
    // 3. 开发环境可以打印验证码到控制台用于测试
    
    console.log(`[测试环境] 手机号 ${phone} 的验证码: ${verifyCode}`);
    
    // 实际生产环境应该调用短信服务API，例如：
    // await sendSMSViaThirdParty(phone, verifyCode);

    // 6. 返回成功（生产环境不应该返回验证码，这里仅用于测试）
    return createSuccessResponse({
      message: '验证码已发送',
      // 开发环境返回验证码，生产环境应删除此行
      code: process.env.NODE_ENV === 'development' ? verifyCode : undefined,
    });
  } catch (error: any) {
    console.error('发送验证码失败:', error);
    return createErrorResponse(ErrorCode.INTERNAL_ERROR, '发送验证码失败');
  }
};

