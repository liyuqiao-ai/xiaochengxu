/**
 * 小程序入口文件
 */

App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'your-env-id', // 云环境ID
        traceUser: true,
      });
    }

    // 检查登录状态
    this.checkLogin();
  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      // 跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login',
      });
    }
  },

  globalData: {
    userInfo: null,
  },
});

