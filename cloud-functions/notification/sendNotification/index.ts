/**
 * 发送通知云函数
 */

import { cloud } from 'wx-server-sdk';
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
 * 主函数
 */
export const main = async (event: any) => {
  const { type, target, data } = event;

  try {
    // 1. 参数验证
    if (!type || !target) {
      return createInvalidParamsResponse('缺少必要参数');
    }

    // TODO: 实现具体的通知逻辑
    // 1. 根据type确定通知模板
    // 2. 根据target确定接收者
    // 3. 发送微信模板消息或站内消息

    console.log('发送通知:', { type, target, data });

    // 2. 保存通知记录
    await db.addDoc('notifications', {
      type,
      target,
      data,
      read: false,
    });

    return createSuccessResponse();
  } catch (error: any) {
    console.error('发送通知失败:', error);
    return createErrorResponse(
      ErrorCode.NOTIFICATION_SEND_FAILED,
      undefined,
      error.message
    );
  }
};

