/**
 * 订单状态机单元测试
 */

import { OrderStateMachine } from '../../shared/utils/orderStateMachine';
import { OrderStatus } from '../../shared/types/order';

describe('OrderStateMachine', () => {
  describe('canTransition', () => {
    it('应该允许 pending → quoted', () => {
      expect(OrderStateMachine.canTransition('pending', 'quoted')).toBe(true);
    });

    it('应该允许 quoted → confirmed', () => {
      expect(OrderStateMachine.canTransition('quoted', 'confirmed')).toBe(true);
    });

    it('应该允许 confirmed → in_progress', () => {
      expect(OrderStateMachine.canTransition('confirmed', 'in_progress')).toBe(true);
    });

    it('应该允许 in_progress → completed', () => {
      expect(OrderStateMachine.canTransition('in_progress', 'completed')).toBe(true);
    });

    it('应该不允许 pending → completed', () => {
      expect(OrderStateMachine.canTransition('pending', 'completed')).toBe(false);
    });

    it('应该允许 pending → cancelled', () => {
      expect(OrderStateMachine.canTransition('pending', 'cancelled')).toBe(true);
    });
  });

  describe('canQuote', () => {
    it('pending 状态应该可以报价', () => {
      expect(OrderStateMachine.canQuote('pending')).toBe(true);
    });

    it('quoted 状态不应该可以报价', () => {
      expect(OrderStateMachine.canQuote('quoted')).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('pending 状态应该可以取消', () => {
      expect(OrderStateMachine.canCancel('pending')).toBe(true);
    });

    it('completed 状态不应该可以取消', () => {
      expect(OrderStateMachine.canCancel('completed')).toBe(false);
    });
  });
});

