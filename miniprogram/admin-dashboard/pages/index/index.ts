/**
 * 管理后台首页 - 数据概览
 */

Page({
  data: {
    dashboardData: {
      totalUsers: 0,
      userGrowth: 0,
      userTrend: 'up',
      activeOrders: 0,
      orderCompletionRate: 0,
      todayIncome: 0,
      totalIncome: 0,
      platformFee: 0,
      feeRate: 0,
    },
    recentActivities: [] as any[],
    loading: false,
  },

  onLoad() {
    // 检查管理员登录状态
    const adminToken = wx.getStorageSync('adminToken');
    if (!adminToken) {
      wx.reLaunch({
        url: '/admin-dashboard/pages/login/index',
      });
      return;
    }

    this.loadDashboardData();
  },

  onPullDownRefresh() {
    this.loadDashboardData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载仪表盘数据
   */
  async loadDashboardData() {
    try {
      this.setData({ loading: true });

      const result = await wx.cloud.callFunction({
        name: 'getAdminStats',
        data: {},
      });

      if (result.result.success) {
        this.setData({
          dashboardData: result.result.data || this.data.dashboardData,
          recentActivities: result.result.recentActivities || [],
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 导航到用户管理
   */
  navigateToUsers() {
    wx.navigateTo({
      url: '/admin-dashboard/pages/users/index',
    });
  },

  /**
   * 导航到订单监控
   */
  navigateToOrders() {
    wx.navigateTo({
      url: '/admin-dashboard/pages/orders/index',
    });
  },

  /**
   * 导航到财务管理
   */
  navigateToFinance() {
    wx.navigateTo({
      url: '/admin-dashboard/pages/finance/index',
    });
  },

  /**
   * 导航到系统配置
   */
  navigateToSystem() {
    wx.navigateTo({
      url: '/admin-dashboard/pages/system/index',
    });
  },
});

