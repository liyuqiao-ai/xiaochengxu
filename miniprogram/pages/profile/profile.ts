/**
 * 个人中心页面
 */

Page({
  data: {
    userInfo: null as any,
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    // 每次显示时刷新用户信息
    this.loadUserInfo();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    } else {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login',
      });
    }
  },

  /**
   * 查看订单
   */
  viewOrders() {
    const userInfo = this.data.userInfo;
    if (!userInfo) return;

    // 根据角色跳转到对应的订单页面
    if (userInfo.role === 'farmer') {
      wx.navigateTo({
        url: '/farmer/pages/order-detail/order-detail',
      });
    } else if (userInfo.role === 'contractor') {
      wx.navigateTo({
        url: '/contractor/pages/index/index',
      });
    } else if (userInfo.role === 'worker') {
      wx.navigateTo({
        url: '/worker/pages/index/index',
      });
    }
  },

  /**
   * 退出登录
   */
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          // 跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login',
          });
        }
      },
    });
  },
});

