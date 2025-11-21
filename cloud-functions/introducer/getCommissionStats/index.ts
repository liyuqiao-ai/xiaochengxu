/**
 * 获取佣金统计云函数
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

    // 检查角色：只有介绍方可以查看佣金统计
    const roleCheck = requireRole(['introducer'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    const { introducerId } = event;
    const userId = context!.userId;

    // 如果传入了introducerId，验证是否匹配
    if (introducerId && introducerId !== userId) {
      return createErrorResponse(ErrorCode.PERMISSION_DENIED, '无权查看其他用户的佣金统计');
    }

    // 2. 查询介绍方关联的订单
    const orders = await db.queryDocs(
      'orders',
      { introducerId: userId },
      {
        orderBy: { field: 'timeline.createdAt', order: 'desc' },
        limit: 1000, // 获取所有订单用于统计
      }
    );

    // 3. 计算统计数据
    const totalProjects = orders.length;
    const totalCommission = orders.reduce((sum: number, order: any) => {
      return sum + (order.financials?.introducerCommission || 0);
    }, 0);

    // 计算已完成订单的佣金（已结算）
    const settledCommission = orders
      .filter((order: any) => order.status === 'completed')
      .reduce((sum: number, order: any) => {
        return sum + (order.financials?.introducerCommission || 0);
      }, 0);

    // 待结算佣金（进行中订单）
    const pendingCommission = orders
      .filter((order: any) => ['confirmed', 'in_progress'].includes(order.status))
      .reduce((sum: number, order: any) => {
        return sum + (order.financials?.introducerCommission || 0);
      }, 0);

    // 按状态统计
    const statusStats = {
      pending: orders.filter((o: any) => o.status === 'pending').length,
      quoted: orders.filter((o: any) => o.status === 'quoted').length,
      confirmed: orders.filter((o: any) => o.status === 'confirmed').length,
      in_progress: orders.filter((o: any) => o.status === 'in_progress').length,
      completed: orders.filter((o: any) => o.status === 'completed').length,
      cancelled: orders.filter((o: any) => o.status === 'cancelled').length,
    };

    const stats = {
      totalProjects,
      totalCommission,
      settledCommission,
      pendingCommission,
      statusStats,
    };

    return createSuccessResponse({ stats });
  } catch (error: any) {
    console.error('获取佣金统计失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

