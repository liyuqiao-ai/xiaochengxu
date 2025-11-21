/**
 * 首页
 */

Page({
  data: {
    userInfo: null as any,
    pendingOrders: [] as any[],
    inProgressOrders: [] as any[],
  },

  onLoad() {
    this.loadUserInfo();
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  /**
   * 加载订单列表
   */
  async loadOrders() {
    try {
      const userInfo = this.data.userInfo;
      if (!userInfo) {
        return;
      }

      // 根据角色加载不同的数据
      if (userInfo.role === 'farmer') {
        // 农户：加载我的订单
        const result = await wx.cloud.callFunction({
          name: 'getMyOrders',
          data: {},
        });

        if (result.result.success) {
          const orders = result.result.data?.orders || [];
          this.setData({
            pendingOrders: orders.filter((o: any) => o.status === 'pending' || o.status === 'quoted'),
            inProgressOrders: orders.filter((o: any) => o.status === 'confirmed' || o.status === 'in_progress'),
          });
        }
      } else if (userInfo.role === 'contractor') {
        // 工头：跳转到工头端首页
        wx.redirectTo({
          url: '/pages/contractor/index/index',
        });
      } else if (userInfo.role === 'worker') {
        // 工人：跳转到工人端首页
        wx.redirectTo({
          url: '/pages/worker/index/index',
        });
      } else if (userInfo.role === 'introducer') {
        // 介绍方：跳转到介绍方端首页
        wx.redirectTo({
          url: '/pages/introducer/index/index',
        });
      }
    } catch (error) {
      console.error('加载订单失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 发布需求
   */
  publishDemand() {
    const userInfo = this.data.userInfo;
    if (!userInfo || userInfo.role !== 'farmer') {
      wx.showToast({
        title: '只有农户可以发布需求',
        icon: 'none',
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/farmer/publish-demand/publish-demand',
    });
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/pages/farmer/order-detail/order-detail?orderId=${orderId}`,
    });
  },
});

