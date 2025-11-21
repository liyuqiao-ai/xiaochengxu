/**
 * 获取用户OpenID云函数
 * 【紧急修复】简化实现，解决登录阻塞
 */

import { cloud } from 'wx-server-sdk';

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 主函数
 */
export const main = async (event: { code?: string }) => {
  const { code } = event;

  try {
    // 使用微信云开发获取openid
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      throw new Error('获取用户openid失败');
    }

    return {
      success: true,
      openid,
      appid: wxContext.APPID || '',
      unionid: wxContext.UNIONID || '',
    };
  } catch (error: any) {
    console.error('获取openid失败:', error);
    return {
      success: false,
      error: error.message || '获取用户openid失败',
    };
  }
};
