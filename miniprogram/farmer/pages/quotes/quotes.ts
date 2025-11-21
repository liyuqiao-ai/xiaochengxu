/**
 * 报价管理页面（农户查看所有报价）
 */

Page({
  data: {
    orderId: '',
    order: null as any,
    quotes: [] as any[],
    loading: false,
  },

  onLoad(options: any) {
    const { orderId } = options;
    if (orderId) {
      this.setData({ orderId });
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '加载中...' });

      // 加载订单详情
      const orderResult = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: { orderId: this.data.orderId },
      });

      if (orderResult.result.success) {
        this.setData({
          order: orderResult.result.data?.order,
        });
      }

      // TODO: 加载所有报价列表
      // 目前订单只有一个报价（contractorId），后续可以扩展为多报价模式
      const order = this.data.order;
      if (order && order.contractorId) {
        // 获取工头信息作为报价信息
        const contractorResult = await wx.cloud.callFunction({
          name: 'getUserInfo',
          data: { userId: order.contractorId },
        });

        if (contractorResult.result.success) {
          const contractor = contractorResult.result.data?.user;
          this.setData({
            quotes: [
              {
                contractorId: order.contractorId,
                contractorName: contractor?.nickName || '工头',
                contractorAvatar: contractor?.avatarUrl || '',
                quotePrice: this.getQuotePrice(order),
                quotedAt: order.timeline.quotedAt,
                creditScore: contractor?.creditScore || 0,
              },
            ],
          });
        }
      }

      wx.hideLoading();
      this.setData({ loading: false });
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 获取报价金额
   */
  getQuotePrice(order: any): number {
    if (order.pricingMode === 'piece' && order.pieceInfo?.unitPrice) {
      return order.pieceInfo.unitPrice;
    }
    if (order.pricingMode === 'daily' && order.dailyInfo?.dailySalary) {
      return order.dailyInfo.dailySalary;
    }
    if (order.pricingMode === 'monthly' && order.monthlyInfo?.monthlySalary) {
      return order.monthlyInfo.monthlySalary;
    }
    return 0;
  },

  /**
   * 接受报价
   */
  async acceptQuote(e: any) {
    const contractorId = e.currentTarget.dataset.contractorId;
    
    try {
      wx.showLoading({ title: '处理中...' });

      const result = await wx.cloud.callFunction({
        name: 'acceptQuote',
        data: { orderId: this.data.orderId },
      });

      wx.hideLoading();

      if (result.result.success) {
        wx.showToast({
          title: '接受成功',
          icon: 'success',
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.error || '接受失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('接受报价失败:', error);
      wx.showToast({
        title: '接受失败',
        icon: 'none',
      });
    }
  },

  /**
   * 查看工头详情
   */
  viewContractorDetail(e: any) {
    const contractorId = e.currentTarget.dataset.contractorId;
    wx.navigateTo({
      url: `/pages/farmer/contractor-detail/contractor-detail?contractorId=${contractorId}`,
    });
  },

  /**
   * 格式化金额（分转元）
   */
  formatAmount(fen: number): string {
    if (!fen) return '0.00';
    return (fen / 100).toFixed(2);
  },

  /**
   * 格式化日期
   */
  formatDate(date: Date | string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
});

