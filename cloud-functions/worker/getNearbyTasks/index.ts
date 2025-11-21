/**
 * 获取附近任务云函数
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

    // 检查角色：只有工人可以查看附近任务
    const roleCheck = requireRole(['worker'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response;
    }

    // 2. 获取用户位置（从参数或用户信息中获取）
    const { latitude, longitude } = event;
    
    // 3. 查询进行中的订单（这些是工人可以加入的任务）
    const orders = await db.queryDocs(
      'orders',
      { status: 'in_progress' },
      {
        orderBy: { field: 'timeline.createdAt', order: 'desc' },
        limit: 50,
      }
    );

    // 4. 根据地理位置筛选附近的任务
    let nearbyOrders = orders;

    if (latitude && longitude) {
      // 计算每个订单与用户位置的距离
      const ordersWithDistance = orders.map((order: any) => {
        if (!order.location || !order.location.lat || !order.location.lng) {
          return { ...order, distance: Infinity };
        }

        // 使用Haversine公式计算两点间距离（单位：公里）
        const R = 6371; // 地球半径（公里）
        const dLat = ((order.location.lat - latitude) * Math.PI) / 180;
        const dLon = ((order.location.lng - longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((latitude * Math.PI) / 180) *
            Math.cos((order.location.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return { ...order, distance };
      });

      // 按距离排序
      ordersWithDistance.sort((a: any, b: any) => a.distance - b.distance);

      // 筛选50公里内的任务（可根据需要调整）
      const maxDistance = event.radius || 50000; // 默认50公里
      nearbyOrders = ordersWithDistance.filter(
        (order: any) => order.distance <= maxDistance / 1000
      );
    }

    return createSuccessResponse({
      tasks: nearbyOrders,
      total: nearbyOrders.length,
    });
  } catch (error: any) {
    console.error('获取附近任务失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

