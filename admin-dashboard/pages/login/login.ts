/**
 * 管理员登录页面
 */

Page({
  data: {
    username: '',
    password: '',
    loading: false,
  },

  onLoad() {
    // 检查是否已登录
    const adminToken = wx.getStorageSync('adminToken');
    if (adminToken) {
      wx.reLaunch({
        url: '/admin-dashboard/pages/index/index',
      });
    }
  },

  /**
   * 输入用户名
   */
  onUsernameInput(e: any) {
    this.setData({
      username: e.detail.value,
    });
  },

  /**
   * 输入密码
   */
  onPasswordInput(e: any) {
    this.setData({
      password: e.detail.value,
    });
  },

  /**
   * 管理员登录
   */
  async adminLogin() {
    const { username, password } = this.data;

    if (!username || !password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none',
      });
      return;
    }

    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '登录中...' });

      const result = await wx.cloud.callFunction({
        name: 'adminLogin',
        data: {
          username,
          password,
        },
      });

      wx.hideLoading();
      this.setData({ loading: false });

      if (result.result.success) {
        wx.setStorageSync('adminToken', result.result.token);
        wx.setStorageSync('adminInfo', result.result.adminInfo);

        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.reLaunch({
            url: '/admin-dashboard/pages/index/index',
          });
        }, 1000);
      } else {
        wx.showToast({
          title: result.result.error || '登录失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('登录失败:', error);
      wx.showToast({
        title: '登录失败',
        icon: 'none',
      });
    }
  },
});

