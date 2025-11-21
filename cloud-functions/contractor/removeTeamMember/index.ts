/**
 * 移除团队成员云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware, requireRole } from '../../../shared/middleware/auth';
import { validateId } from '../../../shared/utils/inputValidation';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { workerId } = event;

  try {
    // 1. 认证和权限检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 检查角色：只有工头可以移除成员
    const roleCheck = requireRole(['contractor'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 参数验证
    if (!workerId) {
      return createInvalidParamsResponse('缺少必要参数：workerId');
    }

    if (!validateId(workerId)) {
      return createInvalidParamsResponse('工人ID格式无效');
    }

    const contractorId = context!.userId;

    // 3. 获取工人信息
    const worker = await db.getDoc('users', workerId);
    if (!worker) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND, '工人不存在');
    }

    // 4. 验证工人是否在该工头的团队中
    if (worker.contractorId !== contractorId) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '该工人不在您的团队中');
    }

    // 5. 检查工人是否有进行中的任务
    const activeOrders = await db.queryDocs('orders', {
      contractorId: contractorId,
      status: 'in_progress',
    });

    // 这里可以添加更严格的检查：如果工人正在执行任务，可能需要先完成任务才能移除
    // 暂时允许移除，但可以记录日志

    // 6. 移除工人的contractorId关联
    await db.updateDoc('users', workerId, {
      contractorId: null,
      updatedAt: new Date(),
    });

    // 7. 发送通知给工人
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'team_member_removed',
          target: workerId,
          data: {
            contractorId,
          },
        },
      });
    } catch (notifyError) {
      console.error('发送通知失败:', notifyError);
    }

    return createSuccessResponse({
      workerId,
      message: '已移除团队成员',
    });
  } catch (error: any) {
    console.error('移除团队成员失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

