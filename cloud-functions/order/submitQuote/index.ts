/**
 * 提交报价云函数
 */

import { cloud } from 'wx-server-sdk';
import { isValidStatusTransition } from '../../../shared/utils/validation';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

export const main = async (event: any) => {
  const { orderId, contractorId, quotePrice } = event;

  try {
    // 1. 参数验证
    if (!orderId || !contractorId || !quotePrice) {
      return { success: false, error: '参数不完整' };
    }

    // 验证报价金额
    if (quotePrice <= 0) {
      return { success: false, error: '报价金额必须大于0' };
    }

    // 2. 验证订单状态
    const orderResult = await db.collection('orders').doc(orderId).get();
    if (!orderResult.data) {
      return { success: false, error: '订单不存在' };
    }

    const order = orderResult.data;

    // 状态验证：必须是 pending 状态才能报价
    if (order.status !== 'pending') {
      return { success: false, error: `订单状态为 ${order.status}，无法报价。只有待报价状态的订单可以报价。` };
    }

    // 使用状态转换验证：pending → quoted 是否合法
    if (!isValidStatusTransition(order.status, 'quoted')) {
      return { success: false, error: `无法从状态 ${order.status} 转换到 quoted` };
    }

    // 3. 验证工头资质
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

    // 4. 更新订单状态和报价
    const updateData: any = {
      contractorId,
      status: 'quoted',
      'timeline.quotedAt': new Date(),
    };

    // 根据计价模式更新价格
    const pricingMode = order.pricingMode;
    if (pricingMode === 'piece') {
      updateData['pieceInfo.unitPrice'] = quotePrice;
    } else if (pricingMode === 'daily') {
      updateData['dailyInfo.dailySalary'] = quotePrice;
    } else if (pricingMode === 'monthly') {
      updateData['monthlyInfo.monthlySalary'] = quotePrice;
    } else {
      return { success: false, error: '不支持的计价模式' };
    }

    // 5. 更新订单
    await db.collection('orders').doc(orderId).update({ data: updateData });

    // 6. 发送通知给农户
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'new_quote',
          target: order.farmerId,
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
