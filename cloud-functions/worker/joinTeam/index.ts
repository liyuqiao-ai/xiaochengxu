/**
 * 工人加入团队云函数
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
  const { contractorId, orderId } = event;

  try {
    // 1. 认证和权限检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 检查角色：只有工人可以加入团队
    const roleCheck = requireRole(['worker'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 参数验证
    if (!contractorId || !orderId) {
      return createInvalidParamsResponse('缺少必要参数：contractorId, orderId');
    }

    if (!validateId(contractorId) || !validateId(orderId)) {
      return createInvalidParamsResponse('ID格式无效');
    }

    const workerId = context!.userId;

    // 3. 验证工头是否存在
    const contractor = await db.getDoc('users', contractorId);
    if (!contractor) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND, '工头不存在');
    }

    if (contractor.role !== 'contractor') {
      return createErrorResponse(ErrorCode.USER_ROLE_MISMATCH, '用户不是工头');
    }

    // 4. 验证订单是否存在且属于该工头
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    if (order.contractorId !== contractorId) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, '订单不属于该工头');
    }

    // 5. 检查工人是否已经在该工头的团队中
    const worker = await db.getDoc('users', workerId);
    if (!worker) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND, '工人不存在');
    }

    if (worker.contractorId === contractorId) {
      return createErrorResponse(ErrorCode.USER_ALREADY_EXISTS, '您已经在该团队中');
    }

    // 6. 检查是否已有待审核的申请
    const existingRequests = await db.queryDocs('team_requests', {
      workerId,
      contractorId,
      status: 'pending',
    });

    if (existingRequests.length > 0) {
      return createErrorResponse(ErrorCode.USER_ALREADY_EXISTS, '您已有待审核的申请');
    }

    // 7. 创建入队申请
    const requestId = await db.addDoc('team_requests', {
      workerId,
      contractorId,
      orderId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 8. 发送通知给工头
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'team_request',
          target: contractorId,
          data: {
            requestId,
            workerId,
            workerName: worker.nickName || '工人',
            orderId,
          },
        },
      });
    } catch (notifyError) {
      console.error('发送通知失败:', notifyError);
    }

    return createSuccessResponse({
      requestId,
      message: '申请已提交，等待工头审核',
    });
  } catch (error: any) {
    console.error('加入团队失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

