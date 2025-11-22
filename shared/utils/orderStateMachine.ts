/**
 * 订单状态机
 * 完整的状态转换验证和管理
 */

import { OrderStatus } from '../types/order';
import { isValidStatusTransition, validateStatusChange } from './validation';
import { UserRole } from '../types/user';

/**
 * 订单状态流转定义
 */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ['quoted', 'cancelled'],
  quoted: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'], // 修复：confirmed只能转换到in_progress或cancelled
  in_progress: ['completed', 'cancelled'],
  completed: ['cancelled'], // 允许已完成订单被取消（特殊情况）
  cancelled: [], // 取消后不可再变更
};

/**
 * 订单状态机类
 */
export class OrderStateMachine {
  /**
   * 检查状态转换是否合法
   */
  static canTransition(currentStatus: OrderStatus, targetStatus: OrderStatus): boolean {
    return isValidStatusTransition(currentStatus, targetStatus);
  }

  /**
   * 执行状态转换（包含角色权限验证）
   */
  static transition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus,
    userRole?: UserRole
  ): { success: boolean; error?: string } {
    // 如果提供了角色，进行完整的验证
    if (userRole) {
      const validation = validateStatusChange(currentStatus, targetStatus, userRole);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.reason,
        };
      }
    } else {
      // 只验证状态转换是否合法
      if (!this.canTransition(currentStatus, targetStatus)) {
        return {
          success: false,
          error: `无法从状态 ${currentStatus} 转换到 ${targetStatus}`,
        };
      }
    }

    return { success: true };
  }

  /**
   * 获取允许的状态转换
   */
  static getAllowedTransitions(status: OrderStatus): OrderStatus[] {
    return ORDER_STATUS_FLOW[status] || [];
  }

  /**
   * 检查是否可以取消
   */
  static canCancel(status: OrderStatus): boolean {
    return ['pending', 'quoted', 'confirmed', 'in_progress', 'completed'].includes(status);
  }

  /**
   * 检查是否可以报价
   */
  static canQuote(status: OrderStatus): boolean {
    return status === 'pending';
  }

  /**
   * 检查是否可以确认
   */
  static canConfirm(status: OrderStatus): boolean {
    return status === 'quoted';
  }

  /**
   * 检查是否可以开始
   */
  static canStart(status: OrderStatus): boolean {
    return status === 'confirmed';
  }

  /**
   * 检查是否可以完成
   */
  static canComplete(status: OrderStatus): boolean {
    return status === 'in_progress';
  }

  /**
   * 检查是否可以支付
   */
  static canPay(status: OrderStatus): boolean {
    return status === 'completed';
  }

  /**
   * 获取状态的中文名称
   */
  static getStatusName(status: OrderStatus): string {
    const statusNames: Record<OrderStatus, string> = {
      pending: '待报价',
      quoted: '已报价',
      confirmed: '已确认',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusNames[status] || status;
  }
}

