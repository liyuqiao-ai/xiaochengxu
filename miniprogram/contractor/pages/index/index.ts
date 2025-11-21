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
    } else {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login',
      });
      return;
    }
  },

  /**
   * 加载订单列表
   */
  async loadOrders() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      return;
    }

    try {
      // 获取待报价订单
      const quotesResult = await wx.cloud.callFunction({
        name: 'getPendingOrders',
        data: {},
      });

      // 获取我的订单
      const myOrdersResult = await wx.cloud.callFunction({
        name: 'getMyOrders',
        data: {},
      });

      if (quotesResult.result.success) {
        const pendingQuotes = quotesResult.result.data?.orders || [];
        this.setData({
          pendingQuotes,
          'stats.pendingQuotesCount': pendingQuotes.length,
        });
      } else {
        this.setData({
          pendingQuotes: [],
          'stats.pendingQuotesCount': 0,
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
      } else {
        this.setData({
          myOrders: [],
          'stats.inProgressCount': 0,
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
        } else {
          this.setData({
            'stats.teamSize': 0,
          });
        }
      } catch (error) {
        console.error('获取团队信息失败:', error);
        this.setData({
          'stats.teamSize': 0,
        });
      }
    } catch (error) {
      console.error('加载订单失败:', error);
      // 出错时显示空状态
      this.setData({
        pendingQuotes: [],
        myOrders: [],
        'stats.pendingQuotesCount': 0,
        'stats.inProgressCount': 0,
        'stats.teamSize': 0,
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

