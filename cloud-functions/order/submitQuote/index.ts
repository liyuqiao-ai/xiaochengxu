/**
 * 提交报价云函数
 */

import { cloud } from 'wx-server-sdk';
import { isValidStatusTransition } from '../../../shared/utils/validation';
import { validateId, validateAmount } from '../../../shared/utils/inputValidation';
import { optimisticUpdate } from '../../../shared/utils/transaction';
import { authMiddleware, requireRole, validateOrderAccess } from '../../../shared/middleware/auth';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

export const main = async (event: any) => {
  const { orderId, contractorId, quotePrice } = event;

  try {
    // 1. 认证检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return { success: false, error: '未授权' };
    }
    const { context } = authResult;

    // 2. 角色检查：只有工头可以报价
    const roleCheck = requireRole(['contractor'])(event, context!);
    if (!roleCheck.success) {
      return { success: false, error: '只有工头可以提交报价' };
    }

    // 3. 参数验证
    if (!orderId || !contractorId || !quotePrice) {
      return { success: false, error: '参数不完整：orderId, contractorId, quotePrice' };
    }

    // 验证ID格式
    if (!validateId(orderId)) {
      return { success: false, error: '订单ID格式无效' };
    }
    if (!validateId(contractorId)) {
      return { success: false, error: '工头ID格式无效' };
    }

    // 验证报价金额（分）
    if (!validateAmount(quotePrice, 1)) {
      return { success: false, error: '报价金额无效，必须大于0且为整数（单位：分）' };
    }

    // 验证工头ID与当前用户一致
    if (contractorId !== context!.userId) {
      return { success: false, error: '只能为自己提交报价' };
    }

    // 4. 验证工头资质
    const contractorResult = await db.collection('users').doc(contractorId).get();
    if (!contractorResult.data) {
      return { success: false, error: '工头不存在' };
    }

    const contractor = contractorResult.data;

    // 验证角色
    if (contractor.role !== 'contractor') {
      return { success: false, error: '用户不是工头' };
    }

    // 验证认证状态：必须是已认证的工头才能报价
    if (!contractor.certification || contractor.certification.status !== 'approved') {
      return { success: false, error: '工头未认证或认证未通过，无法报价' };
    }

    // 验证工头状态：必须是激活状态
    if (contractor.status !== 'active') {
      return { success: false, error: '工头账号未激活' };
    }

    // 5. 使用乐观锁原子性更新订单
    const updateResult = await optimisticUpdate(
      'orders',
      orderId,
      (currentOrder: any) => {
        // 状态验证：必须是 pending 状态才能报价
        if (currentOrder.status !== 'pending') {
          throw new Error(`订单状态为 ${currentOrder.status}，无法报价。只有待报价状态的订单可以报价。`);
        }

        // 使用状态转换验证：pending → quoted 是否合法
        if (!isValidStatusTransition(currentOrder.status, 'quoted')) {
          throw new Error(`无法从状态 ${currentOrder.status} 转换到 quoted`);
        }

        // 检查是否已经有工头报价
        if (currentOrder.contractorId && currentOrder.contractorId !== contractorId) {
          throw new Error('该订单已被其他工头报价');
        }

        // 构建更新数据
        const updateData: any = {
          contractorId,
          status: 'quoted',
          'timeline.quotedAt': new Date(),
        };

        // 根据计价模式更新价格
        const pricingMode = currentOrder.pricingMode;
        if (pricingMode === 'piece') {
          updateData['pieceInfo.unitPrice'] = quotePrice;
        } else if (pricingMode === 'daily') {
          updateData['dailyInfo.dailySalary'] = quotePrice;
        } else if (pricingMode === 'monthly') {
          updateData['monthlyInfo.monthlySalary'] = quotePrice;
        } else {
          throw new Error('不支持的计价模式');
        }

        return updateData;
      }
    );

    if (!updateResult.success) {
      return { success: false, error: updateResult.error || '提交报价失败，请重试' };
    }

    const updatedOrder = updateResult.data;

    // 6. 发送通知给农户
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'new_quote',
          target: updatedOrder.farmerId,
          data: {
            orderId,
            contractorId,
            contractorName: contractor.nickName || '工头',
            quotePrice,
          },
        },
      });
    } catch (notifyError) {
      // 通知失败不影响报价成功
      console.error('发送通知失败:', notifyError);
    }

    return { success: true, orderId, status: 'quoted' };
  } catch (error: any) {
    console.error('提交报价失败:', error);
    return { success: false, error: error.message || '提交报价失败' };
  }
};
