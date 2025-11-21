/**
 * 订单状态机
 */

import { OrderStatus } from '../types/order';
import { isValidStatusTransition } from './validation';

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
   * 执行状态转换
   */
  static transition(
    currentStatus: OrderStatus,
    targetStatus: OrderStatus
  ): { success: boolean; error?: string } {
    if (!this.canTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `无法从状态 ${currentStatus} 转换到 ${targetStatus}`,
      };
    }

    return { success: true };
  }

  /**
   * 获取允许的状态转换
   */
  static getAllowedTransitions(status: OrderStatus): OrderStatus[] {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['quoted', 'cancelled'],
      quoted: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    return transitions[status] || [];
  }

  /**
   * 检查是否可以取消
   */
  static canCancel(status: OrderStatus): boolean {
    return ['pending', 'quoted', 'confirmed'].includes(status);
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
}

