/**
 * 审核团队申请云函数
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
import { optimisticUpdate } from '../../../shared/utils/transaction';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { requestId, status, contractorId: eventContractorId } = event;

  try {
    // 1. 认证和权限检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 检查角色：只有工头可以审核申请
    const roleCheck = requireRole(['contractor'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 参数验证
    if (!requestId || !status) {
      return createInvalidParamsResponse('缺少必要参数：requestId, status');
    }

    if (!validateId(requestId)) {
      return createInvalidParamsResponse('申请ID格式无效');
    }

    if (!['approved', 'rejected'].includes(status)) {
      return createInvalidParamsResponse('status必须是approved或rejected');
    }

    const contractorId = eventContractorId || context!.userId;
    
    // 验证contractorId与当前用户一致
    if (contractorId !== context!.userId) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '只能审核自己的团队申请');
    }

    // 3. 获取申请信息
    const request = await db.getDoc('team_requests', requestId);
    if (!request) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND, '申请不存在');
    }

    // 4. 验证权限：只有申请对应的工头可以审核
    if (request.contractorId !== contractorId) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '无权审核此申请');
    }

    // 5. 验证申请状态
    if (request.status !== 'pending') {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, '申请已处理');
    }

    // 6. 使用乐观锁更新申请状态
    const updateResult = await optimisticUpdate(
      'team_requests',
      requestId,
      (currentRequest: any) => {
        if (currentRequest.status !== 'pending') {
          throw new Error('申请状态已变更');
        }

        return {
          status: status,
          reviewedAt: new Date(),
          reviewedBy: contractorId,
        };
      }
    );

    if (!updateResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, updateResult.error);
    }

    // 7. 如果同意，更新工人的contractorId
    if (status === 'approved') {
      await db.updateDoc('users', request.workerId, {
        contractorId: contractorId,
        updatedAt: new Date(),
      });

      // 发送通知给工人
      try {
        await cloud.callFunction({
          name: 'sendNotification',
          data: {
            type: 'team_request_approved',
            target: request.workerId,
            data: {
              requestId,
              contractorId,
            },
          },
        });
      } catch (notifyError) {
        console.error('发送通知失败:', notifyError);
      }
    } else {
      // 拒绝申请，发送通知给工人
      try {
        await cloud.callFunction({
          name: 'sendNotification',
          data: {
            type: 'team_request_rejected',
            target: request.workerId,
            data: {
              requestId,
              contractorId,
            },
          },
        });
      } catch (notifyError) {
        console.error('发送通知失败:', notifyError);
      }
    }

    return createSuccessResponse({
      requestId,
      status,
      message: status === 'approved' ? '已同意申请' : '已拒绝申请',
    });
  } catch (error: any) {
    console.error('审核申请失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

