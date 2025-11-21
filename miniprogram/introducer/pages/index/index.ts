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
    stats: {
      totalProjects: 0,
      totalCommission: 0,
      pendingCommission: 0,
    },
    qrCodeUrl: '', // 推广二维码
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
    if (userInfo.role !== 'introducer') {
      wx.showModal({
        title: '提示',
        content: '您不是介绍方，无法访问此页面',
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
        const projects = projectsResult.result.data?.projects || [];
        const totalCommission = projects.reduce((sum: number, p: any) => {
          return sum + (p.commission || 0);
        }, 0);
        
        this.setData({
          myProjects: projects,
          'stats.totalProjects': projects.length,
          'stats.totalCommission': totalCommission,
        });
      } else {
        this.setData({
          myProjects: [],
          'stats.totalProjects': 0,
          'stats.totalCommission': 0,
        });
      }

      if (commissionResult.result.success) {
        const records = commissionResult.result.data?.records || [];
        this.setData({
          commissionRecords: records,
        });
      } else {
        this.setData({
          commissionRecords: [],
        });
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      // 出错时显示空状态
      this.setData({
        myProjects: [],
        commissionRecords: [],
      });
    }
  },

  /**
   * 复制推广码
   */
  copyPromotionCode() {
    if (!this.data.promotionCode) {
      wx.showToast({
        title: '推广码不存在',
        icon: 'none',
      });
      return;
    }

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
   * 生成推广码（如果不存在）
   */
  async generatePromoCode() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({ title: '生成中...' });

      // 如果已有推广码，直接使用
      if (this.data.promotionCode) {
        await this.generateQRCode();
        wx.hideLoading();
        return;
      }

      // 调用云函数生成推广码
      const result = await wx.cloud.callFunction({
        name: 'generatePromoCode',
        data: {
          introducerId: userInfo._id,
        },
      });

      wx.hideLoading();

      if (result.result.success) {
        const promoCode = result.result.data?.promoCode || '';
        this.setData({
          promotionCode: promoCode,
        });
        // 生成二维码
        await this.generateQRCode();
      } else {
        wx.showToast({
          title: result.result.error || '生成失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('生成推广码失败:', error);
      wx.showToast({
        title: '生成失败',
        icon: 'none',
      });
    }
  },

  /**
   * 生成推广二维码
   */
  async generateQRCode() {
    if (!this.data.promotionCode) {
      wx.showToast({
        title: '推广码不存在',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({ title: '生成中...' });

      // 调用云函数生成小程序码
      const result = await wx.cloud.callFunction({
        name: 'generateQRCode',
        data: {
          scene: `promotion=${this.data.promotionCode}`,
          page: 'pages/index/index',
          width: 280,
        },
      });

      wx.hideLoading();

      if (result.result.success && result.result.data?.fileID) {
        this.setData({
          qrCodeUrl: result.result.data.fileID,
        });
        // 预览二维码
        wx.previewImage({
          urls: [result.result.data.fileID],
          current: result.result.data.fileID,
        });
      } else {
        wx.showToast({
          title: result.result.error || '生成失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('生成二维码失败:', error);
      wx.showToast({
        title: '生成失败',
        icon: 'none',
      });
    }
  },

  /**
   * 获取佣金统计
   */
  async loadCommissionStats() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      return;
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'getCommissionStats',
        data: {
          introducerId: userInfo._id,
        },
      });

      if (result.result.success) {
        this.setData({
          stats: result.result.data?.stats || this.data.stats,
        });
      }
    } catch (error) {
      console.error('获取佣金统计失败:', error);
    }
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

