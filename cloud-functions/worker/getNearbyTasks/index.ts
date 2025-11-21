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

    // 2. 获取用户位置（从参数中获取）
    const { lat, lng, radius = 10 } = event; // radius默认10公里
    
    if (!lat || !lng) {
      return createErrorResponse(ErrorCode.INVALID_PARAMS, '缺少位置信息：lat, lng');
    }
    
    // 3. 查询待报价和进行中的订单（这些是工人可以查看的任务）
    const pendingOrders = await db.queryDocs(
      'orders',
      { status: 'pending' },
      {
        orderBy: { field: 'timeline.createdAt', order: 'desc' },
        limit: 100,
      }
    );

    const inProgressOrders = await db.queryDocs(
      'orders',
      { status: 'in_progress' },
      {
        orderBy: { field: 'timeline.createdAt', order: 'desc' },
        limit: 100,
      }
    );

    const allOrders = [...pendingOrders, ...inProgressOrders];

    // 4. 根据地理位置筛选附近的任务（使用Haversine公式计算距离）
    /**
     * 计算两点间距离（Haversine公式）
     * @param lat1 纬度1
     * @param lng1 经度1
     * @param lat2 纬度2
     * @param lng2 经度2
     * @returns 距离（公里）
     */
    function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371; // 地球半径（公里）
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    // 计算每个订单与用户位置的距离
    const ordersWithDistance = allOrders
      .filter((order: any) => order.location && order.location.lat && order.location.lng)
      .map((order: any) => {
        const distance = calculateDistance(
          lat,
          lng,
          order.location.lat,
          order.location.lng
        );
        return { ...order, distance };
      })
      .filter((order: any) => order.distance <= radius) // 筛选半径内的任务
      .sort((a: any, b: any) => a.distance - b.distance); // 按距离排序

    const nearbyOrders = ordersWithDistance;

    return createSuccessResponse({
      tasks: nearbyOrders,
      total: nearbyOrders.length,
    });
  } catch (error: any) {
    console.error('获取附近任务失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

