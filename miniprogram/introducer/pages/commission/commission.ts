/**
 * 介绍方佣金页面
 */

Page({
  data: {
    commissionRecords: [] as any[],
    totalCommission: 0,
    loading: false,
  },

  onLoad() {
    this.loadCommissionData();
  },

  onPullDownRefresh() {
    this.loadCommissionData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载佣金数据
   */
  async loadCommissionData() {
    try {
      this.setData({ loading: true });

      // 获取佣金记录
      const result = await wx.cloud.callFunction({
        name: 'getCommissionRecords',
        data: {},
      });

      if (result.result.success) {
        const records = result.result.data?.records || [];
        const total = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

        this.setData({
          commissionRecords: records,
          totalCommission: total,
          loading: false,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载佣金数据失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 申请提现
   */
  applyWithdraw() {
    wx.showModal({
      title: '申请提现',
      content: '提现功能开发中，敬请期待',
      showCancel: false,
    });
  },

  /**
   * 格式化金额
   */
  formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  },

  /**
   * 格式化日期
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },
});

