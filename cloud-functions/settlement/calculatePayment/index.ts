/**
 * 计算支付金额云函数
 * 按照方案要求：PricingEngine类定义在此文件中
 */

import { cloud } from 'wx-server-sdk';
import { Order, PaymentCalculation } from '../../../shared/types/order';
import { PLATFORM_CONFIG } from '../../../shared/constants/config';
import { createDatabase } from '../../../shared/utils/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 计价引擎类
 * 按照方案要求定义在此文件中
 */
class PricingEngine {
  // 平台费率配置
  private static readonly PLATFORM_FEE_RATE = PLATFORM_CONFIG.FEES.PLATFORM_FEE_RATE;
  private static readonly INTRODUCER_COMMISSION_RATE = PLATFORM_CONFIG.FEES.INTRODUCER_COMMISSION_RATE;
  private static readonly STANDARD_WORKING_HOURS = PLATFORM_CONFIG.PRICING.STANDARD_WORKING_HOURS;
  private static readonly OVERTIME_RATE_MULTIPLIER = PLATFORM_CONFIG.PRICING.OVERTIME_RATE_MULTIPLIER;

  /**
   * 计算订单费用
   * @param order 订单对象
   * @returns 支付计算结果
   */
  static calculateOrderPayment(order: Order): PaymentCalculation {
    const baseAmount = this.calculateBaseAmount(order);
    const overtimeCost = this.calculateOvertimeCost(order);
    const totalLaborCost = baseAmount + overtimeCost;

    const introducerCommission = Math.round(totalLaborCost * this.INTRODUCER_COMMISSION_RATE);
    const platformFee = Math.round(totalLaborCost * this.PLATFORM_FEE_RATE);
    const totalAmount = totalLaborCost + introducerCommission;
    const contractorIncome = totalLaborCost - platformFee;

    return {
      baseAmount: totalLaborCost,
      platformFee,
      introducerCommission,
      totalAmount,
      contractorIncome,
      breakdown: {
        laborCost: baseAmount,
        overtimeCost,
        platformFee,
        introducerFee: introducerCommission,
      },
    };
  }

  /**
   * 计算基础劳务费
   * @param order 订单对象
   * @returns 基础劳务费（分）
   */
  private static calculateBaseAmount(order: Order): number {
    switch (order.pricingMode) {
      case 'piece':
        if (!order.pieceInfo) {
          throw new Error('记件模式缺少pieceInfo信息');
        }
        const quantity = order.actualWorkload.quantity ?? order.pieceInfo.estimatedQuantity;
        return Math.round(quantity * order.pieceInfo.unitPrice);

      case 'daily':
        if (!order.dailyInfo) {
          throw new Error('按天模式缺少dailyInfo信息');
        }
        const actualDays = order.actualWorkload.days ?? order.dailyInfo.estimatedDays;
        const actualWorkers = order.actualWorkload.workers ?? order.dailyInfo.estimatedWorkers;
        return Math.round(actualDays * actualWorkers * order.dailyInfo.dailySalary);

      case 'monthly':
        if (!order.monthlyInfo) {
          throw new Error('包月模式缺少monthlyInfo信息');
        }
        const actualMonths = order.actualWorkload.months ?? order.monthlyInfo.estimatedMonths;
        const monthlyWorkers = order.actualWorkload.workers ?? order.monthlyInfo.estimatedWorkers;
        return Math.round(actualMonths * monthlyWorkers * order.monthlyInfo.monthlySalary);

      default:
        throw new Error(`不支持的计价模式: ${order.pricingMode}`);
    }
  }

  /**
   * 计算加班费
   * @param order 订单对象
   * @returns 加班费（分）
   */
  private static calculateOvertimeCost(order: Order): number {
    if (order.actualWorkload.overtimeHours <= 0) {
      return 0;
    }

    let hourlyRate: number;

    switch (order.pricingMode) {
      case 'daily':
        if (!order.dailyInfo) {
          throw new Error('按天模式缺少dailyInfo信息');
        }
        hourlyRate = order.dailyInfo.dailySalary / this.STANDARD_WORKING_HOURS;
        break;

      case 'monthly':
        if (!order.monthlyInfo) {
          throw new Error('包月模式缺少monthlyInfo信息');
        }
        // 月薪按配置的标准工时计算
        hourlyRate = order.monthlyInfo.monthlySalary / PLATFORM_CONFIG.PRICING.MONTHLY_STANDARD_HOURS;
        break;

      case 'piece':
        // 记件模式通常不计算加班费，返回0
        return 0;

      default:
        throw new Error(`不支持的计价模式: ${order.pricingMode}`);
    }

    return Math.round(
      order.actualWorkload.overtimeHours * hourlyRate * this.OVERTIME_RATE_MULTIPLIER
    );
  }
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { orderId } = event;

  try {
    // 1. 参数验证
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }

    // 2. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND);
    }

    // 3. 计算支付金额
    const payment = PricingEngine.calculateOrderPayment(order as Order);

    return createSuccessResponse({ payment });
  } catch (error: any) {
    console.error('计算支付金额失败:', error);
    return createErrorResponse(
      ErrorCode.PAYMENT_CALCULATION_FAILED,
      undefined,
      error.message
    );
  }
};

// 导出PricingEngine供其他云函数使用
export { PricingEngine };
