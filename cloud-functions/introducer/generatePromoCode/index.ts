/**
 * 生成推广码云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware, requireRole } from '../../../shared/middleware/auth';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 主函数
 */
export const main = async (event: any) => {
  try {
    // 1. 认证和权限检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 检查角色：只有介绍方可以生成推广码
    const roleCheck = requireRole(['introducer'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    const { introducerId } = event;
    const userId = context!.userId;

    // 如果传入了introducerId，验证是否匹配
    if (introducerId && introducerId !== userId) {
      return createErrorResponse(ErrorCode.PERMISSION_DENIED, '无权为其他用户生成推广码');
    }

    // 2. 查询用户信息
    const user = await db.getDoc('users', userId);
    if (!user) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND);
    }

    // 3. 如果已有推广码，直接返回
    if (user.promotionCode) {
      return createSuccessResponse({
        promoCode: user.promotionCode,
        message: '推广码已存在',
      });
    }

    // 4. 生成新的推广码（格式：INTRO + 6位随机数字）
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const promoCode = `INTRO${randomNum}`;

    // 5. 更新用户信息
    await db.updateDoc('users', userId, {
      promotionCode: promoCode,
      updatedAt: new Date(),
    });

    return createSuccessResponse({
      promoCode,
      message: '推广码生成成功',
    });
  } catch (error: any) {
    console.error('生成推广码失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

