/**
 * 获取用户OpenID云函数
 */

import { cloud } from 'wx-server-sdk';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { code } = event;

  try {
    // 1. 参数验证
    if (!code) {
      return createInvalidParamsResponse('缺少code参数');
    }

    // 2. 通过code获取openid
    // 注意：在云函数中，可以直接通过cloud.getWXContext()获取openid
    // 但这里为了兼容性，也可以使用code换取openid的方式
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      // 如果无法从上下文获取，尝试通过code获取
      // 注意：这需要在小程序端调用wx.login()获取code
      // 云函数中通常直接使用cloud.getWXContext()即可
      return createErrorResponse(ErrorCode.LOGIN_FAILED, '无法获取用户openid');
    }

    return createSuccessResponse({
      openid,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID || '',
    });
  } catch (error: any) {
    console.error('获取openid失败:', error);
    return createErrorResponse(ErrorCode.LOGIN_FAILED, undefined, error.message);
  }
};

