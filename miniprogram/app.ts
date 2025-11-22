/**
 * 小程序入口文件
 */

// 导入环境配置
// 注意：小程序中需要使用相对路径导入
// 如果无法导入，请直接在此文件中配置 CLOUD_ENV_ID

App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      // 使用DYNAMIC_CURRENT_ENV自动使用当前环境，或从环境变量读取
      const cloudEnvId = process.env.CLOUD_ENV_ID || 'cloud1-3g2i1jqra6ba039d';
      
      wx.cloud.init({
        env: cloudEnvId, // 云环境ID（可通过环境变量配置）
        traceUser: true,
      });
      
      console.log('✅ 云开发已初始化，环境ID:', cloudEnvId);
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

