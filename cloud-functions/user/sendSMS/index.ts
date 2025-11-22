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
 * 通过阿里云发送短信（示例）
 * 需要安装：npm install @alicloud/sms-sdk
 */
async function sendSMSViaAliyun(phone: string, code: string): Promise<void> {
  // 示例代码，需要配置阿里云AccessKey
  // const SMSClient = require('@alicloud/sms-sdk');
  // const client = new SMSClient({
  //   accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  //   secretAccessKey: process.env.ALIYUN_ACCESS_KEY_SECRET,
  // });
  // await client.sendSMS({
  //   PhoneNumbers: phone,
  //   SignName: process.env.ALIYUN_SMS_SIGN_NAME,
  //   TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
  //   TemplateParam: JSON.stringify({ code }),
  // });
  console.log('阿里云短信服务未配置，跳过发送');
}

/**
 * 通过腾讯云发送短信（示例）
 * 需要安装：npm install tencentcloud-sdk-nodejs
 */
async function sendSMSViaTencent(phone: string, code: string): Promise<void> {
  // 示例代码，需要配置腾讯云SecretId和SecretKey
  // const tencentcloud = require('tencentcloud-sdk-nodejs');
  // const SmsClient = tencentcloud.sms.v20210111.Client;
  // const client = new SmsClient({
  //   credential: {
  //     secretId: process.env.TENCENT_SECRET_ID,
  //     secretKey: process.env.TENCENT_SECRET_KEY,
  //   },
  // });
  // await client.SendSms({
  //   PhoneNumberSet: [phone],
  //   SmsSdkAppId: process.env.TENCENT_SMS_APP_ID,
  //   TemplateId: process.env.TENCENT_SMS_TEMPLATE_ID,
  //   TemplateParamSet: [code],
  // });
  console.log('腾讯云短信服务未配置，跳过发送');
}

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

    // 5. 发送短信
    // 注意：微信小程序云开发不直接支持发送短信，需要集成第三方短信服务
    // 开发环境：打印验证码到控制台
    console.log(`[测试环境] 手机号 ${phone} 的验证码: ${verifyCode}`);
    
    // 生产环境：调用第三方短信服务API
    // 示例：集成阿里云短信服务
    if (process.env.NODE_ENV === 'production' && process.env.SMS_PROVIDER === 'aliyun') {
      try {
        await sendSMSViaAliyun(phone, verifyCode);
      } catch (smsError) {
        console.error('发送短信失败:', smsError);
        // 短信发送失败不影响验证码保存，用户可以通过其他方式获取
      }
    }
    // 示例：集成腾讯云短信服务
    else if (process.env.NODE_ENV === 'production' && process.env.SMS_PROVIDER === 'tencent') {
      try {
        await sendSMSViaTencent(phone, verifyCode);
      } catch (smsError) {
        console.error('发送短信失败:', smsError);
      }
    }

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

