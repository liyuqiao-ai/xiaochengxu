/**
 * 农户工作台
 */

Page({
  data: {
    userInfo: null as any,
    pendingQuotes: 0, // 待处理报价数量
    inProgressOrders: [] as any[],
    pendingOrders: [] as any[],
    stats: {
      totalOrders: 0,
      pendingQuotes: 0,
      activeOrders: 0,
      completedOrders: 0,
    },
    loading: false,
  },

  onLoad() {
    // 先检查登录状态和角色权限
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: '/pages/login/login',
      });
      return;
    }

    // 验证角色权限
    if (userInfo.role !== 'farmer') {
      wx.showModal({
        title: '提示',
        content: '您不是农户，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.reLaunch({
            url: '/pages/entry/entry',
          });
        },
      });
      return;
    }

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
    return this.loadDashboardData();
  },

  /**
   * 加载工作台数据
   */
  async loadDashboardData() {
    try {
      const userInfo = this.data.userInfo;
      if (!userInfo) return;

      this.setData({ loading: true });

      // 并行加载所有数据
      const [ordersResult, quotesResult, statsResult] = await Promise.all([
        wx.cloud.callFunction({
          name: 'getFarmerOrders',
          data: { farmerId: userInfo._id },
        }).catch(() => ({ result: { success: false, pendingOrders: [], inProgressOrders: [] } })),
        wx.cloud.callFunction({
          name: 'getPendingQuotes',
          data: { farmerId: userInfo._id },
        }).catch(() => ({ result: { success: false, quotes: [] } })),
        wx.cloud.callFunction({
          name: 'getFarmerStats',
          data: { farmerId: userInfo._id },
        }).catch(() => ({ result: { success: false, stats: {} } })),
      ]);

      this.setData({
        pendingOrders: ordersResult.result.pendingOrders || [],
        inProgressOrders: ordersResult.result.inProgressOrders || [],
        pendingQuotes: quotesResult.result.quotes || [],
        stats: statsResult.result.stats || {},
        loading: false,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  /**
   * 刷新数据
   */
  async refreshData() {
    await this.loadData();
    wx.showToast({
      title: '刷新成功',
      icon: 'success',
    });
  },

  /**
   * 联系客服
   */
  contactSupport() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-xxx-xxxx\n工作时间：9:00-18:00',
      showCancel: true,
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '400-xxx-xxxx',
          });
        }
      },
    });
  },

  /**
   * 查看进行中订单
   */
  viewActiveOrders() {
    if (this.data.stats.activeOrders > 0) {
      // 可以跳转到进行中订单列表
      wx.showToast({
        title: '功能开发中',
        icon: 'none',
      });
    } else {
      wx.showToast({
        title: '暂无进行中订单',
        icon: 'none',
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

