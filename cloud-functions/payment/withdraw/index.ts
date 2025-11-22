/**
 * 余额提现云函数
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
    const { context } = authResult;

    // 2. 参数验证
    const { amount, bankAccount, bankName, accountName } = event;

    if (!amount || amount <= 0) {
      return createInvalidParamsResponse('提现金额必须大于0');
    }

    // 金额必须是整数（分）
    if (!Number.isInteger(amount)) {
      return createInvalidParamsResponse('提现金额格式错误');
    }

    // 最小提现金额：10元 = 1000分
    if (amount < 1000) {
      return createInvalidParamsResponse('最小提现金额为10元');
    }

    if (!bankAccount || !accountName) {
      return createInvalidParamsResponse('缺少银行卡信息');
    }

    // 3. 获取用户信息
    const user = await db.getDoc('users', context!.userId);
    if (!user) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND);
    }

    // 4. 检查余额
    const balance = user.balance || 0;
    if (balance < amount) {
      return createErrorResponse(ErrorCode.INSUFFICIENT_BALANCE, '余额不足');
    }

    // 5. 创建提现申请
    const withdrawRecord = await db.addDoc('withdrawals', {
      userId: context!.userId,
      amount,
      bankAccount,
      bankName: bankName || '',
      accountName,
      status: 'pending', // pending, processing, completed, failed
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6. 冻结余额（从可用余额中扣除）
    await db.updateDoc('users', context!.userId, {
      balance: balance - amount,
      frozenBalance: (user.frozenBalance || 0) + amount,
      updatedAt: new Date(),
    });

    // 7. 发送通知
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'withdraw_submitted',
          target: context!.userId,
          data: {
            withdrawId: withdrawRecord._id,
            amount,
          },
        },
      });
    } catch (notifyError) {
      console.error('发送通知失败:', notifyError);
    }

    return createSuccessResponse({
      withdrawId: withdrawRecord._id,
      amount,
      status: 'pending',
      message: '提现申请已提交，请等待审核',
    });
  } catch (error: any) {
    console.error('提现申请失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

