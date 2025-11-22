/**
 * 管理员登录页面
 */

Page({
  data: {
    username: '',
    password: '',
    loading: false,
    errorMessage: '',
  },

  onUsernameInput(e: any) {
    this.setData({ username: e.detail.value });
  },

  onPasswordInput(e: any) {
    this.setData({ password: e.detail.value });
  },

  async onLogin() {
    const { username, password } = this.data;

    if (!username || !password) {
      this.setData({ errorMessage: '请输入账号和密码' });
      return;
    }

    this.setData({ loading: true, errorMessage: '' });

    try {
      const result = await wx.cloud.callFunction({
        name: 'adminLogin',
        data: { username, password },
      });

      if (result.result.success) {
        // 保存管理员登录状态
        wx.setStorageSync('adminToken', result.result.token);
        wx.setStorageSync('adminUser', result.result.admin);

        // 跳转到管理后台首页
        wx.reLaunch({
          url: '/admin-dashboard/pages/index/index',
        });
      } else {
        this.setData({ errorMessage: result.result.error || '登录失败' });
      }
    } catch (error) {
      console.error('登录失败:', error);
      this.setData({ errorMessage: '登录失败，请重试' });
    } finally {
      this.setData({ loading: false });
    }
  },
});

