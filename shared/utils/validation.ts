/**
 * 数据验证工具函数
 */

import { Order, OrderStatus, PricingMode } from '../types/order';

/**
 * 验证订单状态流转是否合法
 * @param currentStatus 当前状态
 * @param targetStatus 目标状态
 * @returns 是否合法
 */
export function isValidStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['quoted', 'cancelled'],
    quoted: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
}

/**
 * 验证订单数据完整性
 * @param order 订单对象
 * @returns 验证结果
 */
export function validateOrder(order: Partial<Order>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!order.farmerId) {
    errors.push('缺少农户ID');
  }

  if (!order.jobType) {
    errors.push('缺少工种类型');
  }

  if (!order.pricingMode) {
    errors.push('缺少计价模式');
  }

  if (!order.location) {
    errors.push('缺少工作地点');
  } else {
    if (!order.location.lat || !order.location.lng) {
      errors.push('工作地点坐标不完整');
    }
    if (!order.location.address) {
      errors.push('缺少工作地点地址');
    }
  }

  // 根据计价模式验证对应信息
  if (order.pricingMode) {
    switch (order.pricingMode) {
      case 'piece':
        if (!order.pieceInfo) {
          errors.push('记件模式缺少pieceInfo信息');
        } else {
          if (!order.pieceInfo.unit) {
            errors.push('缺少记件单位');
          }
          if (!order.pieceInfo.estimatedQuantity || order.pieceInfo.estimatedQuantity <= 0) {
            errors.push('预估数量必须大于0');
          }
        }
        break;

      case 'daily':
        if (!order.dailyInfo) {
          errors.push('按天模式缺少dailyInfo信息');
        } else {
          if (!order.dailyInfo.estimatedWorkers || order.dailyInfo.estimatedWorkers <= 0) {
            errors.push('预估用工人数必须大于0');
          }
          if (!order.dailyInfo.estimatedDays || order.dailyInfo.estimatedDays <= 0) {
            errors.push('预估天数必须大于0');
          }
          if (!order.dailyInfo.dailySalary || order.dailyInfo.dailySalary <= 0) {
            errors.push('日薪必须大于0');
          }
        }
        break;

      case 'monthly':
        if (!order.monthlyInfo) {
          errors.push('包月模式缺少monthlyInfo信息');
        } else {
          if (!order.monthlyInfo.estimatedWorkers || order.monthlyInfo.estimatedWorkers <= 0) {
            errors.push('预估用工人数必须大于0');
          }
          if (!order.monthlyInfo.estimatedMonths || order.monthlyInfo.estimatedMonths <= 0) {
            errors.push('预估月数必须大于0');
          }
          if (!order.monthlyInfo.monthlySalary || order.monthlyInfo.monthlySalary <= 0) {
            errors.push('月薪必须大于0');
          }
        }
        break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证金额（分）
 * @param amount 金额
 * @param min 最小值
 * @param max 最大值
 * @returns 是否合法
 */
export function validateAmount(amount: number, min = 0, max = 5000000): boolean {
  return amount >= min && amount <= max && Number.isInteger(amount);
}

