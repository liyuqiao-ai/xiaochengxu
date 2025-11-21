/**
 * 用户登录云函数
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
  const { code, userInfo } = event;

  try {
    // 1. 参数验证
    if (!code || !userInfo) {
      return createInvalidParamsResponse('缺少必要参数');
    }

    // 2. 通过code获取openid
    const loginResult = await cloud.callFunction({
      name: 'getOpenId',
      data: { code },
    });

    if (!loginResult.result?.openid) {
      return createErrorResponse(ErrorCode.LOGIN_FAILED, '获取用户信息失败');
    }

    const openid = loginResult.result.openid;

    // 3. 查询用户是否存在
    const users = await db.queryDocs('users', { openid });

    let userId: string;
    let userData: any;

    if (users.length > 0) {
      // 用户已存在，更新信息
      userId = users[0]._id;
      await db.updateDoc('users', userId, userInfo);
      userData = {
        ...users[0],
        ...userInfo,
      };
    } else {
      // 新用户，创建记录
      userId = await db.addDoc('users', {
        openid,
        ...userInfo,
        role: 'farmer', // 默认角色，后续可修改
        status: 'pending',
      });
      userData = {
        _id: userId,
        openid,
        ...userInfo,
        role: 'farmer',
        status: 'pending',
      };
    }

    // 4. 生成token
    const token = generateToken({
      userId,
      openid,
      role: userData.role,
    });

    return createSuccessResponse({
      userInfo: userData,
      token,
    });
  } catch (error: any) {
    console.error('登录失败:', error);
    return createErrorResponse(ErrorCode.LOGIN_FAILED, undefined, error.message);
  }
};

