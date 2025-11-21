/**
 * 获取团队成员云函数
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

    // 检查角色：只有工头可以查看团队成员
    const roleCheck = requireRole(['contractor'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    const contractorId = context!.userId;

    // 2. 查询团队成员（contractorId字段等于当前工头ID的工人）
    const members = await db.queryDocs(
      'users',
      {
        role: 'worker',
        contractorId: contractorId,
        status: 'active',
      },
      {
        orderBy: { field: 'createdAt', order: 'desc' },
      }
    );

    // 3. 获取每个成员的统计信息（可选）
    const membersWithStats = await Promise.all(
      members.map(async (member: any) => {
        // 查询该成员完成的任务数
        const completedTasks = await db.countDocs('orders', {
          status: 'completed',
          // 这里需要根据实际业务逻辑查询，可能需要额外的关联表
        });

        return {
          ...member,
          stats: {
            completedTasks,
          },
        };
      })
    );

    return createSuccessResponse({
      members: membersWithStats,
      total: membersWithStats.length,
    });
  } catch (error: any) {
    console.error('获取团队成员失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

