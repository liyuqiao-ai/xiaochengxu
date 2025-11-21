/**
 * 获取待审核的入队申请云函数
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

    // 检查角色：只有工头可以查看入队申请
    const roleCheck = requireRole(['contractor'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    const contractorId = context!.userId;

    // 2. 查询待审核的申请
    const requests = await db.queryDocs(
      'team_requests',
      {
        contractorId,
        status: 'pending',
      },
      {
        orderBy: { field: 'createdAt', order: 'desc' },
      }
    );

    // 3. 获取申请人的详细信息
    const requestsWithDetails = await Promise.all(
      requests.map(async (request: any) => {
        const worker = await db.getDoc('users', request.workerId);
        const order = await db.getDoc('orders', request.orderId);

        return {
          ...request,
          worker: worker
            ? {
                _id: worker._id,
                nickName: worker.nickName,
                avatarUrl: worker.avatarUrl,
                creditScore: worker.creditScore || 0,
                skills: worker.skills || [],
              }
            : null,
          order: order
            ? {
                _id: order._id,
                jobType: order.jobType,
                location: order.location,
              }
            : null,
        };
      })
    );

    return createSuccessResponse({
      requests: requestsWithDetails,
      total: requestsWithDetails.length,
    });
  } catch (error: any) {
    console.error('获取入队申请失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

