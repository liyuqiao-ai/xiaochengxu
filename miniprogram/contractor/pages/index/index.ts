/**
 * 工头端首页
 */

Page({
  data: {
    userInfo: null as any,
    stats: {
      pendingQuotesCount: 0,
      inProgressCount: 0,
      teamSize: 0,
    },
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
        const pendingQuotes = quotesResult.result.data?.orders || [];
        this.setData({
          pendingQuotes,
          'stats.pendingQuotesCount': pendingQuotes.length,
        });
      }

      if (myOrdersResult.result.success) {
        const myOrders = myOrdersResult.result.data?.orders || [];
        const inProgressOrders = myOrders.filter(
          (o: any) => o.status === 'confirmed' || o.status === 'in_progress'
        );
        this.setData({
          myOrders,
          'stats.inProgressCount': inProgressOrders.length,
        });
      }

      // 获取团队人数
      try {
        const teamResult = await wx.cloud.callFunction({
          name: 'getTeamMembers',
          data: {},
        });
        if (teamResult.result.success) {
          const members = teamResult.result.data?.members || [];
          this.setData({
            'stats.teamSize': members.length,
          });
        }
      } catch (error) {
        console.error('获取团队信息失败:', error);
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
   * 查看需求广场
   */
  viewOrderList() {
    wx.navigateTo({
      url: '/contractor/pages/order-list/order-list',
    });
  },

  /**
   * 查看团队管理
   */
  viewTeam() {
    wx.navigateTo({
      url: '/contractor/pages/team/team',
    });
  },

  /**
   * 查看需求详情
   */
  viewOrderDetail(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/contractor/pages/order-detail/order-detail?orderId=${orderId}`,
    });
  },

  /**
   * 开始报价
   */
  startQuote(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/contractor/pages/submit-quote/submit-quote?orderId=${orderId}`,
    });
  },
});

