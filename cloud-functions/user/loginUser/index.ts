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

    // 2. 通过云函数上下文获取openid（推荐方式）
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return createErrorResponse(ErrorCode.LOGIN_FAILED, '无法获取用户openid');
    }

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
      // 新用户，创建记录（role为空，等待用户选择）
      userId = await db.addDoc('users', {
        openid,
        ...userInfo,
        role: '', // 空角色，等待用户选择
        status: 'active',
        balance: 0, // 初始余额为0
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      userData = {
        _id: userId,
        openid,
        ...userInfo,
        role: '', // 空角色，等待用户选择
        status: 'active',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
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

