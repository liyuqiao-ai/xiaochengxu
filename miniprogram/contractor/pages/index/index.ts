/**
 * 工头端首页
 */

Page({
  data: {
    userInfo: null as any,
    pendingQuotes: [] as any[],
    myOrders: [] as any[],
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
      // 获取待报价订单
      const quotesResult = await wx.cloud.callFunction({
        name: 'getPendingOrders',
      });

      // 获取我的订单
      const myOrdersResult = await wx.cloud.callFunction({
        name: 'getMyOrders',
      });

      if (quotesResult.result.success) {
        this.setData({
          pendingQuotes: quotesResult.result.data?.orders || [],
        });
      }

      if (myOrdersResult.result.success) {
        this.setData({
          myOrders: myOrdersResult.result.data?.orders || [],
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
   * 查看需求详情
   */
  viewOrderDetail(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/pages/contractor/order-detail/order-detail?orderId=${orderId}`,
    });
  },

  /**
   * 开始报价
   */
  startQuote(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/pages/contractor/submit-quote/submit-quote?orderId=${orderId}`,
    });
  },
});

