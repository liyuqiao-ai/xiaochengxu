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
    // 验证订单状态
    const orderResult = await db.collection('orders').doc(orderId).get();
    if (!orderResult.data || orderResult.data.status !== 'pending') {
      return { success: false, error: '订单不可报价' };
    }

    // 验证工头资质
    const contractorResult = await db.collection('users').doc(contractorId).get();
    const contractor = contractorResult.data;
    if (!contractor || contractor.role !== 'contractor' || contractor.certification?.status !== 'approved') {
      return { success: false, error: '工头未认证' };
    }

    // 更新订单状态和报价
    const updateData: any = {
      contractorId,
      status: 'quoted',
      'timeline.quotedAt': new Date(),
    };

    // 根据计价模式更新价格
    const pricingMode = orderResult.data.pricingMode;
    if (pricingMode === 'piece') {
      updateData['pieceInfo.unitPrice'] = quotePrice;
    } else if (pricingMode === 'daily') {
      updateData['dailyInfo.dailySalary'] = quotePrice;
    } else if (pricingMode === 'monthly') {
      updateData['monthlyInfo.monthlySalary'] = quotePrice;
    }

    await db.collection('orders').doc(orderId).update({ data: updateData });

    // 发送通知给农户
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'new_quote',
          target: orderResult.data.farmerId,
          data: { orderId, contractorId, quotePrice },
        },
      });
    } catch (notifyError) {
      // 通知失败不影响报价成功
      console.error('发送通知失败:', notifyError);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
