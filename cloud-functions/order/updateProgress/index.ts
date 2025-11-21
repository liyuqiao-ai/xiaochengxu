/**
 * 更新订单进度云函数
 */

import { cloud } from 'wx-server-sdk';
import { createDatabase } from '../../../shared/utils/db';
import { validateId } from '../../../shared/utils/inputValidation';
import { authMiddleware, validateOrderAccess } from '../../../shared/middleware/auth';
import { optimisticUpdate } from '../../../shared/utils/transaction';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = createDatabase();

export const main = async (event: any) => {
  const { orderId, progress, description, images } = event;

  try {
    // 1. 认证检查
    const authResult = authMiddleware(event);
    if (!authResult.success) {
      return authResult.response;
    }
    const { context } = authResult;

    // 2. 参数验证
    if (!orderId) {
      return createInvalidParamsResponse('缺少订单ID');
    }

    if (!validateId(orderId)) {
      return createInvalidParamsResponse('订单ID格式无效');
    }

    if (progress !== undefined && (progress < 0 || progress > 100)) {
      return createInvalidParamsResponse('进度值必须在0-100之间');
    }

    // 3. 验证订单访问权限
    const accessResult = await validateOrderAccess(context!.userId, orderId);
    if (!accessResult.success) {
      return createErrorResponse(ErrorCode.ORDER_NOT_FOUND, accessResult.error || '无权操作此订单');
    }

    const order = accessResult.order;

    // 4. 验证订单状态
    if (order.status !== 'in_progress') {
      return createErrorResponse(
        ErrorCode.ORDER_STATUS_INVALID,
        `订单状态为 ${order.status}，无法更新进度。只有进行中的订单可以更新进度。`
      );
    }

    // 5. 使用乐观锁原子性更新订单进度
    const updateResult = await optimisticUpdate(
      'orders',
      orderId,
      (currentOrder: any) => {
        // 再次验证状态
        if (currentOrder.status !== 'in_progress') {
          throw new Error('订单状态已变更，无法更新进度');
        }

        const updateData: any = {
          updatedAt: new Date(),
        };

        if (progress !== undefined) {
          updateData.progress = progress;
        }

        if (description !== undefined) {
          updateData.progressDescription = description;
        }

        if (images !== undefined && Array.isArray(images)) {
          updateData.progressImages = images;
        }

        // 更新时间轴
        if (!currentOrder.timeline.progressUpdates) {
          updateData['timeline.progressUpdates'] = [];
        }
        updateData['timeline.progressUpdates'].push({
          progress: progress || currentOrder.progress || 0,
          description,
          images,
          updatedAt: new Date(),
          updatedBy: context!.userId,
        });

        return updateData;
      }
    );

    if (!updateResult.success) {
      return createErrorResponse(ErrorCode.ORDER_STATUS_INVALID, updateResult.error || '更新进度失败，请重试');
    }

    // 6. 发送通知给农户
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'progress_updated',
          target: order.farmerId,
          data: {
            orderId,
            progress: progress || updateResult.data?.progress,
          },
        },
      });
    } catch (notifyError) {
      console.error('发送通知失败:', notifyError);
    }

    return createSuccessResponse({ orderId, progress: progress || updateResult.data?.progress });
  } catch (error: any) {
    console.error('更新进度失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

