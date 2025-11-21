/**
 * 获取工人统计数据云函数
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

    // 检查角色：只有工人可以查看自己的统计
    const roleCheck = requireRole(['worker'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    const workerId = context!.userId;

    // 2. 获取工人信息
    const worker = await db.getDoc('users', workerId);
    if (!worker) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND, '工人不存在');
    }

    // 3. 统计已完成的任务数
    // 注意：这里需要根据实际业务逻辑查询
    // 如果订单中有workerId字段，可以直接查询
    // 否则需要通过contractorId和订单状态来推断
    const completedTasksCount = await db.countDocs('orders', {
      status: 'completed',
      // 这里可能需要根据实际数据结构调整查询条件
      // 例如：如果有workerId字段，可以添加 { workerId }
    });

    // 4. 统计进行中的任务数
    const inProgressTasksCount = await db.countDocs('orders', {
      status: 'in_progress',
      contractorId: worker.contractorId,
    });

    // 5. 计算总收入（从结算记录中统计）
    // 这里简化处理，实际应该从settlements或payments表中统计
    const settlements = await db.queryDocs('settlements', {
      // 需要根据实际数据结构查询工人的收入
      // 这里暂时返回0，需要根据实际业务逻辑实现
    });

    let totalIncome = 0;
    // 计算总收入逻辑（需要根据实际数据结构实现）

    // 6. 获取信用分
    const creditScore = worker.creditScore || 0;

    // 7. 构建统计数据
    const stats = {
      totalTasks: completedTasksCount + inProgressTasksCount,
      completedTasks: completedTasksCount,
      inProgressTasks: inProgressTasksCount,
      totalIncome, // 单位：分
      creditScore,
      contractorId: worker.contractorId || null,
      contractorName: null as string | null,
    };

    // 8. 如果有绑定的工头，获取工头信息
    if (worker.contractorId) {
      const contractor = await db.getDoc('users', worker.contractorId);
      if (contractor) {
        stats.contractorName = contractor.nickName || null;
      }
    }

    return createSuccessResponse({
      stats,
    });
  } catch (error: any) {
    console.error('获取工人统计失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

