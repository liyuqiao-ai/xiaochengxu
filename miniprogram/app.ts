/**
 * 小程序入口文件
 */

// 导入环境配置
// 注意：小程序中需要使用相对路径导入
// 如果无法导入，请直接在此文件中配置 CLOUD_ENV_ID

// 云环境ID配置
// 请在微信开发者工具中：云开发 -> 设置 -> 环境设置 中获取环境ID
// 或者使用 cloud.DYNAMIC_CURRENT_ENV 自动使用当前环境
const CLOUD_ENV_ID = 'cloud1-3g2i1jqra6ba039d'; // 云环境ID

App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      // 云环境ID已配置
      console.log('✅ 云环境ID已配置:', CLOUD_ENV_ID);

      wx.cloud.init({
        env: CLOUD_ENV_ID, // 云环境ID
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

