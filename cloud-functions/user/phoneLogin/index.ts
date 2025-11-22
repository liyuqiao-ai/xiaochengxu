/**
 * 手机号验证码登录云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { generateToken } from '../../../shared/utils/jwt';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { phone, verifyCode } = event;

  try {
    // 1. 参数验证
    if (!phone || !verifyCode) {
      return createInvalidParamsResponse('缺少手机号或验证码');
    }

    // 验证手机号格式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      return createErrorResponse(ErrorCode.INVALID_PARAMS, '手机号格式不正确');
    }

    // 验证验证码格式
    if (!/^\d{6}$/.test(verifyCode)) {
      return createErrorResponse(ErrorCode.INVALID_PARAMS, '验证码格式不正确');
    }

    // 2. 查找验证码记录
    const now = new Date();
    const codeRecord = await db
      .collection('sms_codes')
      .where({
        phone: phone,
        code: verifyCode,
        used: false,
        expiresAt: db.command.gte(now),
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (codeRecord.data.length === 0) {
      return createErrorResponse(ErrorCode.INVALID_CODE, '验证码错误或已过期');
    }

    const codeData = codeRecord.data[0];

    // 3. 标记验证码为已使用
    await db.collection('sms_codes').doc(codeData._id).update({
      data: {
        used: true,
        usedAt: now,
      },
    });

    // 4. 查找或创建用户
    let user = await db
      .collection('users')
      .where({
        phone: phone,
      })
      .get();

    if (user.data.length === 0) {
      // 新用户，创建账户
      const newUser = {
        phone: phone,
        role: '', // 需要后续选择角色
        createdAt: now,
        updatedAt: now,
        // 从微信上下文获取openid（如果有）
        openid: cloud.getWXContext().OPENID || '',
      };

      const addResult = await db.collection('users').add({
        data: newUser,
      });

      user = {
        data: [
          {
            ...newUser,
            _id: addResult._id,
          },
        ],
      };
    }

    const userData = user.data[0];

    // 5. 更新用户最后登录时间
    await db.collection('users').doc(userData._id).update({
      data: {
        lastLoginAt: now,
        updatedAt: now,
      },
    });

    // 6. 生成Token
    const token = generateToken({
      userId: userData._id,
      phone: userData.phone,
      role: userData.role,
    });

    // 7. 返回用户信息和Token
    return createSuccessResponse({
      userInfo: {
        _id: userData._id,
        phone: userData.phone,
        role: userData.role,
        nickName: userData.nickName || `用户${userData.phone.slice(-4)}`,
        avatarUrl: userData.avatarUrl || '',
        realName: userData.realName || '',
        creditScore: userData.creditScore || 100,
        createdAt: userData.createdAt,
      },
      token: token,
    });
  } catch (error: any) {
    console.error('手机号登录失败:', error);
    return createErrorResponse(ErrorCode.INTERNAL_ERROR, '登录失败');
  }
};

