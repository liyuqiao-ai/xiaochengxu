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
    
    try {
      wx.showLoading({ title: '登录中...' });

      // 1. 获取微信登录code
      const loginRes = await wx.login();
      if (!loginRes.code) {
        throw new Error('获取登录code失败');
      }

      // 2. 获取用户信息
      let userProfile: any;
      try {
        userProfile = await wx.getUserProfile({
          desc: '用于完善用户资料',
        });
      } catch (error: any) {
        // 用户拒绝授权，提示并返回
        if (error.errMsg && error.errMsg.includes('deny')) {
          wx.hideLoading();
          wx.showModal({
            title: '提示',
            content: '需要授权用户信息才能使用完整功能',
            showCancel: false,
          });
          return;
        }
        throw error;
      }

      // 3. 调用云函数注册/登录
      const result = await wx.cloud.callFunction({
        name: 'loginUser',
        data: {
          code: loginRes.code,
          userInfo: userProfile.userInfo,
        },
      });

      wx.hideLoading();

      if (result.result.success) {
        // 保存用户信息
        const userInfo = result.result.userInfo;
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('token', result.result.token);

        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
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
        }, 1000);
      } else {
        // 登录失败，尝试重试
        if (retryCount < MAX_RETRY) {
          wx.showModal({
            title: '登录失败',
            content: `登录失败，是否重试？(${retryCount + 1}/${MAX_RETRY})`,
            success: (res) => {
              if (res.confirm) {
                this.wxLogin(retryCount + 1);
              }
            },
          });
        } else {
          wx.showToast({
            title: result.result.error || '登录失败，请稍后重试',
            icon: 'none',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      wx.hideLoading();
      console.error('登录失败:', error);
      
      // 网络错误或其他错误，尝试重试
      if (retryCount < MAX_RETRY) {
        wx.showModal({
          title: '登录失败',
          content: `网络错误，是否重试？(${retryCount + 1}/${MAX_RETRY})`,
          success: (res) => {
            if (res.confirm) {
              this.wxLogin(retryCount + 1);
            }
          },
        });
      } else {
        wx.showToast({
          title: '登录失败，请检查网络后重试',
          icon: 'none',
          duration: 3000,
        });
      }
    }
  },
});

