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
 * 发送微信订阅消息
 */
async function sendSubscribeMessage(openid: string, templateId: string, data: any, page?: string) {
  try {
    // 注意：需要在小程序端先调用wx.requestSubscribeMessage获取用户授权
    // 这里只是发送逻辑，实际使用时需要确保用户已授权
    
    // 如果配置了订阅消息模板ID，可以发送
    // 这里简化处理，实际需要根据通知类型选择对应的模板ID
    console.log('发送订阅消息:', { openid, templateId, data, page });
    
    // TODO: 实际发送订阅消息
    // await cloud.openapi.subscribeMessage.send({
    //   touser: openid,
    //   template_id: templateId,
    //   page: page || 'pages/index/index',
    //   data: data,
    // });
    
    return true;
  } catch (error) {
    console.error('发送订阅消息失败:', error);
    return false;
  }
}

/**
 * 发送站内通知
 */
async function sendInAppNotification(target: string, type: string, data: any) {
  try {
    // 保存通知记录到数据库
    await db.addDoc('notifications', {
      target,
      type,
      data,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('保存站内通知失败:', error);
    return false;
  }
}

/**
 * 获取通知模板配置
 */
function getNotificationTemplate(type: string): { templateId?: string; title: string; content: string } {
  const templates: Record<string, { templateId?: string; title: string; content: string }> = {
    new_demand: {
      title: '新需求通知',
      content: '有新的工作需求，快去查看吧！',
    },
    new_quote: {
      title: '新报价通知',
      content: '有工头对您的订单进行了报价',
    },
    quote_accepted: {
      title: '报价被接受',
      content: '您的报价已被农户接受',
    },
    quote_rejected: {
      title: '报价被拒绝',
      content: '您的报价已被农户拒绝',
    },
    work_started: {
      title: '工作已开始',
      content: '订单工作已开始',
    },
    progress_updated: {
      title: '进度更新',
      content: '订单进度已更新',
    },
    order_completed: {
      title: '订单已完成',
      content: '订单已完成，请查看详情',
    },
    order_cancelled: {
      title: '订单已取消',
      content: '订单已被取消',
    },
    team_request: {
      title: '入队申请',
      content: '有工人申请加入您的团队',
    },
    team_request_approved: {
      title: '入队申请通过',
      content: '您的入队申请已通过',
    },
    team_request_rejected: {
      title: '入队申请被拒绝',
      content: '您的入队申请被拒绝',
    },
    team_member_removed: {
      title: '被移出团队',
      content: '您已被移出团队',
    },
  };

  return templates[type] || { title: '系统通知', content: '您有一条新通知' };
}

/**
 * 获取接收者openid
 */
async function getReceiverOpenid(target: string | string[]): Promise<string[]> {
  if (Array.isArray(target)) {
    // 如果是数组，获取所有用户的openid
    const users = await db.queryDocs('users', {
      _id: { $in: target },
    });
    return users.map((user: any) => user.openid).filter(Boolean);
  } else if (target === 'contractors') {
    // 如果是'contractors'，获取所有工头的openid
    const contractors = await db.queryDocs('users', {
      role: 'contractor',
      status: 'active',
    });
    return contractors.map((contractor: any) => contractor.openid).filter(Boolean);
  } else {
    // 单个用户ID
    const user = await db.getDoc('users', target);
    return user?.openid ? [user.openid] : [];
  }
}

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { type, target, data } = event;

  try {
    // 1. 参数验证
    if (!type || !target) {
      return createInvalidParamsResponse('缺少必要参数：type, target');
    }

    // 2. 获取通知模板
    const template = getNotificationTemplate(type);

    // 3. 获取接收者openid列表
    const openids = await getReceiverOpenid(target);

    if (openids.length === 0) {
      console.warn('没有找到接收者');
      return createSuccessResponse({ message: '没有找到接收者' });
    }

    // 4. 发送站内通知（保存到数据库）
    const targetIds = Array.isArray(target) ? target : [target];
    for (const targetId of targetIds) {
      if (targetId !== 'contractors') {
        await sendInAppNotification(targetId, type, {
          ...data,
          title: template.title,
          content: template.content,
        });
      }
    }

    // 5. 发送订阅消息（如果配置了模板ID）
    if (template.templateId) {
      for (const openid of openids) {
        try {
          await sendSubscribeMessage(openid, template.templateId, {
            thing1: { value: template.title },
            thing2: { value: template.content },
            time3: { value: new Date().toLocaleString('zh-CN') },
          });
        } catch (error) {
          console.error(`发送订阅消息失败 [${openid}]:`, error);
        }
      }
    }

    return createSuccessResponse({
      sent: openids.length,
      message: '通知发送成功',
    });
  } catch (error: any) {
    console.error('发送通知失败:', error);
    return createErrorResponse(
      ErrorCode.NOTIFICATION_SEND_FAILED,
      undefined,
      error.message
    );
  }
};
