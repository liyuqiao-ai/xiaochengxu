/**
 * 确认工作量云函数
 */

import { cloud } from 'wx-server-sdk';
import { PricingEngine } from '../../settlement/calculatePayment/index';
import { createDatabase } from '../../../shared/utils/db';
import { optimisticUpdate } from '../../../shared/utils/transaction';
import { validateId, validateAmount } from '../../../shared/utils/inputValidation';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';
import { authMiddleware, validateOrderAccess } from '../../../shared/middleware/auth';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = createDatabase();

/**
 * 触发结算
 */
async function triggerSettlement(orderId: string, payment: any) {
  // TODO: 实现结算逻辑
  console.log('触发结算:', { orderId, payment });
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { orderId, actualWorkload, confirmedBy } = event;

  try {
    // 1. 认证检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return { success: false, error: '未授权' };
    }
    const { context } = authResult;

    // 2. 参数验证
    if (!orderId || !actualWorkload || !confirmedBy) {
      return { success: false, error: '缺少必要参数：orderId, actualWorkload, confirmedBy' };
    }

    // 验证ID格式
    if (!validateId(orderId)) {
      return { success: false, error: '订单ID格式无效' };
    }

    // 验证确认方
    if (!['farmer', 'contractor'].includes(confirmedBy)) {
      return { success: false, error: '无效的确认方，必须是 farmer 或 contractor' };
    }

    // 验证工作量数据
    if (typeof actualWorkload !== 'object' || actualWorkload === null) {
      return { success: false, error: '工作量数据格式无效' };
    }

    // 验证订单访问权限
    const accessResult = await validateOrderAccess(context!.userId, orderId);
    if (!accessResult.success) {
      return { success: false, error: accessResult.error || '无权操作此订单' };
    }

    const order = accessResult.order;

    // 验证订单状态
    if (order.status !== 'in_progress') {
      return { success: false, error: `订单状态为 ${order.status}，无法确认工作量。只有进行中的订单可以确认工作量。` };
    }

    // 验证确认方身份
    if (confirmedBy === 'farmer' && order.farmerId !== context!.userId) {
      return { success: false, error: '只有订单的农户可以确认工作量' };
    }
    if (confirmedBy === 'contractor' && order.contractorId !== context!.userId) {
      return { success: false, error: '只有订单的工头可以确认工作量' };
    }

    // 3. 使用乐观锁原子性更新订单
    const updateResult = await optimisticUpdate(
      'orders',
      orderId,
      (currentOrder: any) => {
        // 合并工作量数据
        const mergedWorkload = {
          ...(currentOrder.actualWorkload || {}),
          ...actualWorkload,
        };

        // 验证工作量数值
        if (mergedWorkload.quantity !== undefined && mergedWorkload.quantity < 0) {
          throw new Error('工作量数量不能为负数');
        }
        if (mergedWorkload.days !== undefined && mergedWorkload.days < 0) {
          throw new Error('工作天数不能为负数');
        }
        if (mergedWorkload.months !== undefined && mergedWorkload.months < 0) {
          throw new Error('工作月数不能为负数');
        }
        if (mergedWorkload.workers !== undefined && mergedWorkload.workers < 0) {
          throw new Error('用工人数不能为负数');
        }
        if (mergedWorkload.overtimeHours !== undefined && mergedWorkload.overtimeHours < 0) {
          throw new Error('加班小时数不能为负数');
        }

        const updateData: any = {
          actualWorkload: mergedWorkload,
        };

        // 标记确认状态
        if (confirmedBy === 'farmer') {
          updateData.confirmedByFarmer = true;
        } else {
          updateData.confirmedByContractor = true;
        }

        // 检查是否双方都确认
        const bothConfirmed =
          (updateData.confirmedByFarmer || currentOrder.confirmedByFarmer) &&
          (updateData.confirmedByContractor || currentOrder.confirmedByContractor);

        if (bothConfirmed) {
          // 计算费用
          const updatedOrder = {
            ...currentOrder,
            actualWorkload: mergedWorkload,
          };
          const payment = PricingEngine.calculateOrderPayment(updatedOrder);

          updateData.financials = payment;
          updateData.status = 'completed';
          updateData['timeline.completedAt'] = new Date();
        }

        return updateData;
      }
    );

    if (!updateResult.success) {
      return { success: false, error: updateResult.error || '更新订单失败，请重试' };
    }

    const updatedOrder = updateResult.data;

    // 4. 如果双方都确认，触发自动分账
    if (updatedOrder.status === 'completed' && updatedOrder.financials) {
      const payments = await db.queryDocs('payments', { orderId, status: 'paid' });
      if (payments.length > 0) {
        try {
          await cloud.callFunction({
            name: 'executeSettlement',
            data: {
              orderId,
              paymentId: payments[0]._id,
            },
          });
        } catch (error) {
          console.error('自动分账失败:', error);
          // 分账失败不影响工作量确认成功
        }
      }
    }

    const bothConfirmed =
      (updatedOrder.confirmedByFarmer && updatedOrder.confirmedByContractor) || false;

    return { success: true, bothConfirmed, orderStatus: updatedOrder.status };
  } catch (error: any) {
    console.error('确认工作量失败:', error);
    return { success: false, error: error.message || '确认工作量失败' };
  }
};

