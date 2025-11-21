/**
 * 登录页
 */

Page({
  data: {
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    loading: false,
    loginError: '',
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      // 已登录，根据角色跳转
      const selectedRole = wx.getStorageSync('selectedRole');
      const role = selectedRole || userInfo.role;
      const roleRoutes: Record<string, string> = {
        farmer: '/farmer/pages/index/index',
        contractor: '/contractor/pages/index/index',
        worker: '/worker/pages/index/index',
        introducer: '/introducer/pages/index/index',
      };
      const route = roleRoutes[role] || '/pages/entry/entry';
      wx.reLaunch({ url: route });
    }
  },

  /**
   * 微信登录（带重试机制）
   */
  async wxLogin(retryCount = 0) {
    const MAX_RETRY = 3;
    
    this.setData({ loading: true, loginError: '' });
    
    try {
      // 1. 获取微信登录code
      const loginRes = await wx.login();
      if (!loginRes.code) {
        throw new Error('获取登录code失败');
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

        this.setData({ loading: false });

        // 跳转到入口页面
        wx.reLaunch({ url: '/pages/entry/entry' });
      } else {
        this.setData({
          loginError: result.result.error || '登录失败',
          loading: false,
        });
      }
    } catch (error: any) {
      console.error('登录失败:', error);
      
      // 用户拒绝授权
      if (error.errMsg && error.errMsg.includes('deny')) {
        this.setData({
          loginError: '需要授权用户信息才能使用完整功能',
          loading: false,
        });
        return;
      }

      // 其他错误
      this.setData({
        loginError: '登录失败，请重试',
        loading: false,
      });
    }
  },
});

