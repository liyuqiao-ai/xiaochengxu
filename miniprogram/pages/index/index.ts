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
      // TODO: 调用云函数获取订单列表
      // const result = await wx.cloud.callFunction({
      //   name: 'getOrders',
      //   data: { status: ['pending', 'in_progress'] }
      // });
      
      // 临时数据
      this.setData({
        pendingOrders: [],
        inProgressOrders: [],
      });
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

