/**
 * 获取用户信息云函数
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
 * 主函数
 */
export const main = async (event: any) => {
  try {
    // 1. 认证检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }

    // 2. 参数验证
    const { userId } = event;
    if (!userId) {
      return createInvalidParamsResponse('缺少用户ID');
    }

    // 3. 获取用户信息
    const user = await db.getDoc('users', userId);
    if (!user) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND);
    }

    // 4. 脱敏处理（移除敏感信息）
    const { openid, ...safeUser } = user;

    return createSuccessResponse({ user: safeUser });
  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

