/**
 * 订单流程集成测试
 */

import { OrderStateMachine } from '../../shared/utils/orderStateMachine';
import { PricingEngine } from '../../shared/utils/pricing';
import { Order } from '../../shared/types/order';

describe('订单完整流程', () => {
  it('应该完成从创建到完成的完整流程', async () => {
    // 注意：这是集成测试框架，实际测试需要连接真实的云函数和数据库
    // 在本地测试环境中，可以mock云函数调用

    // 1. 创建订单
    const orderData: Partial<Order> = {
      farmerId: 'test_farmer_001',
      jobType: 'harvest',
      pricingMode: 'piece',
      status: 'pending',
      pieceInfo: {
        unit: 'acre',
        estimatedQuantity: 10,
        unitPrice: 5000,
      },
      location: {
        lat: 39.9042,
        lng: 116.4074,
        address: '测试地址',
      },
      actualWorkload: {
        overtimeHours: 0,
      },
      timeline: {
        createdAt: new Date(),
      },
    };

    // 2. 验证订单状态转换
    expect(OrderStateMachine.canTransition('pending', 'quoted')).toBe(true);
    expect(OrderStateMachine.canTransition('quoted', 'confirmed')).toBe(true);
    expect(OrderStateMachine.canTransition('confirmed', 'in_progress')).toBe(true);
    expect(OrderStateMachine.canTransition('in_progress', 'completed')).toBe(true);

    // 3. 测试计价引擎
    const order: Order = {
      ...orderData,
      _id: 'test_order_001',
      status: 'completed',
      actualWorkload: {
        quantity: 10,
        overtimeHours: 0,
      },
    } as Order;

    const payment = PricingEngine.calculateOrderPayment(order);
    expect(payment.baseAmount).toBeGreaterThan(0);
    expect(payment.platformFee).toBeGreaterThan(0);
    expect(payment.totalAmount).toBeGreaterThan(payment.baseAmount);

    // 4. 验证状态机方法
    expect(OrderStateMachine.canQuote('pending')).toBe(true);
    expect(OrderStateMachine.canCancel('pending')).toBe(true);
    expect(OrderStateMachine.canComplete('in_progress')).toBe(true);
  });

  it('应该正确处理订单取消流程', () => {
    // 测试取消订单的状态转换
    expect(OrderStateMachine.canCancel('pending')).toBe(true);
    expect(OrderStateMachine.canCancel('quoted')).toBe(true);
    expect(OrderStateMachine.canCancel('confirmed')).toBe(true);
    expect(OrderStateMachine.canCancel('in_progress')).toBe(false);
    expect(OrderStateMachine.canCancel('completed')).toBe(false);
  });

  it('应该正确计算不同计价模式的费用', () => {
    // 测试记件模式
    const pieceOrder: Order = {
      _id: 'test_001',
      farmerId: 'farmer_001',
      jobType: 'harvest',
      pricingMode: 'piece',
      status: 'completed',
      pieceInfo: {
        unit: 'acre',
        estimatedQuantity: 10,
        unitPrice: 5000,
      },
      actualWorkload: {
        quantity: 10,
        overtimeHours: 0,
      },
      location: { lat: 0, lng: 0, address: '' },
      timeline: { createdAt: new Date() },
    } as Order;

    const piecePayment = PricingEngine.calculateOrderPayment(pieceOrder);
    expect(piecePayment.baseAmount).toBe(50000); // 10 * 5000

    // 测试按天模式
    const dailyOrder: Order = {
      _id: 'test_002',
      farmerId: 'farmer_001',
      jobType: 'harvest',
      pricingMode: 'daily',
      status: 'completed',
      dailyInfo: {
        estimatedWorkers: 2,
        estimatedDays: 5,
        dailySalary: 20000,
        workingHours: 8,
      },
      actualWorkload: {
        days: 5,
        workers: 2,
        overtimeHours: 0,
      },
      location: { lat: 0, lng: 0, address: '' },
      timeline: { createdAt: new Date() },
    } as Order;

    const dailyPayment = PricingEngine.calculateOrderPayment(dailyOrder);
    expect(dailyPayment.baseAmount).toBe(200000); // 5 * 2 * 20000
  });
});

