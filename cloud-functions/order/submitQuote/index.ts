/**
 * 提交报价云函数
 * 状态转换：pending → quoted
 */

import { cloud } from 'wx-server-sdk';
import { Order, OrderStatus, PricingMode } from '../../../shared/types/order';
import { isValidStatusTransition } from '../../../shared/utils/validation';
import { validateId, validateAmount } from '../../../shared/utils/inputValidation';
import { optimisticUpdate } from '../../../shared/utils/transaction';
import { authMiddleware, requireRole } from '../../../shared/middleware/auth';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 云函数事件参数
 */
interface SubmitQuoteEvent {
  orderId: string;
  contractorId: string;
  quotePrice: number; // 报价（分）
  token?: string;
}

/**
 * 主函数
 */
export const main = async (event: SubmitQuoteEvent) => {
  const { orderId, contractorId, quotePrice } = event;

  try {
    // 1. 认证检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response!;
    }
    const { context } = authResult;

    // 2. 角色检查：只有工头可以报价
    const roleCheck = requireRole(['contractor'])(event, context!);
    if (!roleCheck.success) {
      return roleCheck.response!;
    }

    // 3. 参数验证
    const { orderId, contractorId, quotePrice } = event;
    if (!orderId || !contractorId || !quotePrice) {
      return createInvalidParamsResponse('参数不完整：orderId, contractorId, quotePrice');
    }

    // 验证ID格式
    if (!validateId(orderId)) {
      return createInvalidParamsResponse('订单ID格式无效');
    }
    if (!validateId(contractorId)) {
      return createInvalidParamsResponse('工头ID格式无效');
    }

    // 验证报价金额（分）
    if (!validateAmount(quotePrice, 1)) {
      return createInvalidParamsResponse('报价金额无效，必须大于0且为整数（单位：分）');
    }

    // 验证工头ID与当前用户一致
    if (contractorId !== context!.userId) {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '只能为自己提交报价');
    }

    // 4. 验证工头资质
    const contractorResult = await db.collection('users').doc(contractorId).get();
    if (!contractorResult.data) {
      return createErrorResponse(ErrorCode.USER_NOT_FOUND, '工头不存在');
    }

    const contractor = contractorResult.data;

    // 验证角色
    if (contractor.role !== 'contractor') {
      return createErrorResponse(ErrorCode.USER_ROLE_MISMATCH, '用户不是工头');
    }

    // 验证认证状态：必须是已认证的工头才能报价
    if (!contractor.certification || contractor.certification.status !== 'approved') {
      return createErrorResponse(ErrorCode.USER_NOT_VERIFIED, '工头未认证或认证未通过，无法报价');
    }

    // 验证工头状态：必须是激活状态
    if (contractor.status !== 'active') {
      return createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '工头账号未激活');
    }

    // 5. 使用乐观锁原子性更新订单
    const updateResult = await optimisticUpdate<Order>(
      'orders',
      orderId,
      (currentOrder: Order) => {
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
          status: 'quoted' as OrderStatus,
          'timeline.quotedAt': new Date(),
        };

        // 根据计价模式更新价格
        const pricingMode = currentOrder.pricingMode;
        if (pricingMode === 'piece') {
          if (!currentOrder.pieceInfo) {
            throw new Error('订单缺少记件信息');
          }
          updateData['pieceInfo.unitPrice'] = quotePrice;
        } else if (pricingMode === 'daily') {
          if (!currentOrder.dailyInfo) {
            throw new Error('订单缺少按天信息');
          }
          updateData['dailyInfo.dailySalary'] = quotePrice;
        } else if (pricingMode === 'monthly') {
          if (!currentOrder.monthlyInfo) {
            throw new Error('订单缺少包月信息');
          }
          updateData['monthlyInfo.monthlySalary'] = quotePrice;
        } else {
          throw new Error(`不支持的计价模式: ${pricingMode}`);
        }

        return updateData;
      }
    );

    if (!updateResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, updateResult.error);
    }

    const updatedOrder = updateResult.data!;

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

    return createSuccessResponse({
      orderId,
      status: 'quoted',
      quotedAt: new Date(),
    });
  } catch (error: any) {
    console.error('提交报价失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};
