/**
 * 管理后台数据概览页面
 */

Page({
  data: {
    stats: {
      totalUsers: 0,
      activeOrders: 0,
      todayIncome: 0,
      pendingReviews: 0,
    },
    loading: false,
  },

  onLoad() {
    // 检查管理员登录状态
    const adminToken = wx.getStorageSync('adminToken');
    if (!adminToken) {
      wx.reLaunch({
        url: '/admin-dashboard/pages/login/login',
      });
      return;
    }

    this.loadStats();
  },

  onPullDownRefresh() {
    this.loadStats().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    try {
      this.setData({ loading: true });

      const result = await wx.cloud.callFunction({
        name: 'getAdminStats',
        data: {},
      });

      if (result.result.success) {
        this.setData({
          stats: result.result.data?.stats || this.data.stats,
          loading: false,
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: result.result.error || '加载失败',
          icon: 'none',
        });
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载统计数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 跳转到用户管理
   */
  navigateToUsers() {
    wx.navigateTo({
      url: '/admin-dashboard/pages/users/users',
    });
  },

  /**
   * 跳转到订单监控
   */
  navigateToOrders() {
    wx.navigateTo({
      url: '/admin-dashboard/pages/orders/orders',
    });
  },

  /**
   * 跳转到财务管理
   */
  navigateToFinance() {
    wx.navigateTo({
      url: '/admin-dashboard/pages/finance/finance',
    });
  },
});

