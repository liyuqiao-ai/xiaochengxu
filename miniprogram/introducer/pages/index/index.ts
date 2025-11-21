/**
 * 介绍方端首页
 */

Page({
  data: {
    userInfo: null as any,
    promotionCode: '',
    totalCommission: 0,
    myProjects: [] as any[],
    commissionRecords: [] as any[],
  },

  onLoad() {
    this.loadUserInfo();
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
      this.setData({
        userInfo,
        promotionCode: userInfo.promotionCode || '',
        totalCommission: userInfo.totalCommission || 0,
      });
    }
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 获取我的项目
      const projectsResult = await wx.cloud.callFunction({
        name: 'getMyProjects',
        data: {},
      });

      // 获取佣金记录
      const commissionResult = await wx.cloud.callFunction({
        name: 'getCommissionRecords',
        data: {},
      });

      if (projectsResult.result.success) {
        this.setData({
          myProjects: projectsResult.result.data?.projects || [],
        });
      }

      if (commissionResult.result.success) {
        this.setData({
          commissionRecords: commissionResult.result.data?.records || [],
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 复制推广码
   */
  copyPromotionCode() {
    wx.setClipboardData({
      data: this.data.promotionCode,
      success: () => {
        wx.showToast({
          title: '已复制',
          icon: 'success',
        });
      },
    });
  },

  /**
   * 分享推广
   */
  sharePromotion() {
    wx.showShareMenu({
      withShareTicket: true,
    });
  },

  /**
   * 查看项目详情
   */
  viewProjectDetail(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/pages/introducer/project-detail/project-detail?orderId=${orderId}`,
    });
  },

  /**
   * 申请提现
   */
  applyWithdraw() {
    wx.navigateTo({
      url: '/pages/introducer/withdraw/withdraw',
    });
  },

  /**
   * 格式化金额（分转元）
   */
  formatAmount(fen: number): string {
    if (!fen) return '0.00';
    return (fen / 100).toFixed(2);
  },
});

