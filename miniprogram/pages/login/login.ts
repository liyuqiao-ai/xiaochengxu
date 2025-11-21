/**
 * 登录页
 */

Page({
  data: {
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      wx.reLaunch({
        url: '/pages/index/index',
      });
    }
  },

  /**
   * 微信登录
   */
  async wxLogin() {
    try {
      // 1. 获取用户信息
      const loginRes = await wx.login();
      if (!loginRes.code) {
        wx.showToast({
          title: '登录失败',
          icon: 'none',
        });
        return;
      }

      // 2. 获取用户信息
      const userProfile = await wx.getUserProfile({
        desc: '用于完善用户资料',
      });

      // 3. 调用云函数注册/登录
      const result = await wx.cloud.callFunction({
        name: 'loginUser',
        data: {
          code: loginRes.code,
          userInfo: userProfile.userInfo,
        },
      });

      if (result.result.success) {
        // 保存用户信息
        wx.setStorageSync('userInfo', result.result.userInfo);
        wx.setStorageSync('token', result.result.token);

        // 跳转到首页
        wx.reLaunch({
          url: '/pages/index/index',
        });
      } else {
        wx.showToast({
          title: result.result.error || '登录失败',
          icon: 'none',
        });
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      wx.showToast({
        title: '登录失败',
        icon: 'none',
      });
    }
  },
});

