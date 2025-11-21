/**
 * 计价引擎单元测试
 */

import { PricingEngine } from '../../cloud-functions/settlement/calculatePayment/index';
import { Order } from '../../shared/types/order';

describe('PricingEngine', () => {
  describe('calculateOrderPayment', () => {
    it('应该正确计算记件模式的费用', () => {
      const order: Partial<Order> = {
        pricingMode: 'piece',
        pieceInfo: {
          unit: 'acre',
          estimatedQuantity: 10,
          unitPrice: 5000, // 50元/亩
        },
        actualWorkload: {
          quantity: 10,
          overtimeHours: 0,
        },
      };

      const result = PricingEngine.calculateOrderPayment(order as Order);

      expect(result.baseAmount).toBe(50000); // 10亩 × 5000分
      expect(result.platformFee).toBeGreaterThan(0);
      expect(result.totalAmount).toBeGreaterThan(result.baseAmount);
    });

    it('应该正确计算按天模式的费用', () => {
      const order: Partial<Order> = {
        pricingMode: 'daily',
        dailyInfo: {
          estimatedWorkers: 2,
          estimatedDays: 5,
          dailySalary: 20000, // 200元/人/天
          workingHours: 8,
        },
        actualWorkload: {
          days: 5,
          workers: 2,
          overtimeHours: 0,
        },
      };

      const result = PricingEngine.calculateOrderPayment(order as Order);

      expect(result.baseAmount).toBe(200000); // 5天 × 2人 × 20000分
      expect(result.platformFee).toBeGreaterThan(0);
    });

    it('应该正确计算包月模式的费用', () => {
      const order: Partial<Order> = {
        pricingMode: 'monthly',
        monthlyInfo: {
          estimatedWorkers: 2,
          estimatedMonths: 1,
          monthlySalary: 500000, // 5000元/人/月
        },
        actualWorkload: {
          months: 1,
          workers: 2,
          overtimeHours: 0,
        },
      };

      const result = PricingEngine.calculateOrderPayment(order as Order);

      expect(result.baseAmount).toBe(1000000); // 1月 × 2人 × 500000分
      expect(result.platformFee).toBeGreaterThan(0);
    });

    it('应该正确计算加班费', () => {
      const order: Partial<Order> = {
        pricingMode: 'daily',
        dailyInfo: {
          estimatedWorkers: 2,
          estimatedDays: 5,
          dailySalary: 20000,
          workingHours: 8,
        },
        actualWorkload: {
          days: 5,
          workers: 2,
          overtimeHours: 4, // 4小时加班
        },
      };

      const result = PricingEngine.calculateOrderPayment(order as Order);

      expect(result.breakdown.overtimeCost).toBeGreaterThan(0);
    });
  });
});

