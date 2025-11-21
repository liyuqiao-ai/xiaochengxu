/**
 * 农户工作台
 */

Page({
  data: {
    userInfo: null as any,
    pendingQuotes: 0, // 待处理报价数量
    inProgressOrders: [] as any[],
    pendingOrders: [] as any[],
    loading: false,
  },

  onLoad() {
    this.loadUserInfo();
    this.loadData();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
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
    } else {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login',
      });
      return;
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      return;
    }

    try {
      this.setData({ loading: true });

      // 获取我的订单
      const result = await wx.cloud.callFunction({
        name: 'getMyOrders',
        data: {},
      });

      if (result.result.success) {
        const orders = result.result.data?.orders || [];
        
        // 分类订单
        const pendingOrders = orders.filter(
          (o: any) => o.status === 'pending' || o.status === 'quoted'
        );
        const inProgressOrders = orders.filter(
          (o: any) => o.status === 'confirmed' || o.status === 'in_progress'
        );

        // 统计待处理报价
        const pendingQuotes = orders.filter(
          (o: any) => o.status === 'quoted'
        ).length;

        this.setData({
          pendingOrders,
          inProgressOrders,
          pendingQuotes,
          loading: false,
        });
      } else {
        // 即使失败也显示空状态
        this.setData({
          pendingOrders: [],
          inProgressOrders: [],
          pendingQuotes: 0,
          loading: false,
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      // 出错时也显示空状态
      this.setData({
        pendingOrders: [],
        inProgressOrders: [],
        pendingQuotes: 0,
        loading: false,
      });
    }
  },

  /**
   * 发布需求
   */
  publishDemand() {
    wx.navigateTo({
      url: '/farmer/pages/publish-demand/publish-demand',
    });
  },

  /**
   * 查看待处理报价
   */
  viewPendingQuotes() {
    if (this.data.pendingQuotes > 0) {
      // 跳转到第一个有报价的订单详情
      const quotedOrder = this.data.pendingOrders.find(
        (o: any) => o.status === 'quoted'
      );
      if (quotedOrder) {
        wx.navigateTo({
          url: `/farmer/pages/order-detail/order-detail?orderId=${quotedOrder._id}`,
        });
      }
    } else {
      wx.showToast({
        title: '暂无待处理报价',
        icon: 'none',
      });
    }
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/farmer/pages/order-detail/order-detail?orderId=${orderId}`,
    });
  },

  /**
   * 查看所有订单
   */
  viewAllOrders() {
    // 可以跳转到订单列表页面（如果存在）
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },
});

