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
        const userInfo = result.result.userInfo;
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('token', result.result.token);

        // 检查是否有选择的角色
        const selectedRole = wx.getStorageSync('selectedRole');
        if (selectedRole) {
          // 如果有选择的角色，跳转到对应角色页面
          wx.removeStorageSync('selectedRole');
          const roleRoutes: Record<string, string> = {
            farmer: '/farmer/pages/index/index',
            contractor: '/contractor/pages/index/index',
            worker: '/worker/pages/index/index',
            introducer: '/introducer/pages/index/index',
          };
          const route = roleRoutes[selectedRole];
          if (route) {
            wx.reLaunch({ url: route });
            return;
          }
        }

        // 根据用户角色跳转
        const roleRoutes: Record<string, string> = {
          farmer: '/farmer/pages/index/index',
          contractor: '/contractor/pages/index/index',
          worker: '/worker/pages/index/index',
          introducer: '/introducer/pages/index/index',
        };
        const route = roleRoutes[userInfo.role] || '/pages/entry/entry';
        wx.reLaunch({ url: route });
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

