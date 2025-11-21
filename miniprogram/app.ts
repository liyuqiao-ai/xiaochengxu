/**
 * 小程序入口文件
 */

// 导入环境配置
// 注意：小程序中需要使用相对路径导入
// 如果无法导入，请直接在此文件中配置 CLOUD_ENV_ID

// 云环境ID配置
// 请在微信开发者工具中：云开发 -> 设置 -> 环境设置 中获取环境ID
// 或者使用 cloud.DYNAMIC_CURRENT_ENV 自动使用当前环境
const CLOUD_ENV_ID = 'your-env-id'; // ⚠️ 请替换为实际的云环境ID，或使用 cloud.DYNAMIC_CURRENT_ENV

App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      // 检查是否配置了环境ID
      if (CLOUD_ENV_ID === 'your-env-id') {
        console.warn('⚠️ 请先配置云环境ID！在 miniprogram/app.ts 中设置 CLOUD_ENV_ID');
        wx.showModal({
          title: '配置提示',
          content: '请先配置云环境ID，否则无法使用云开发功能',
          showCancel: false,
        });
      }

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

