/**
 * 工头端报价管理页面
 */

Page({
  data: {
    quotes: [] as any[],
    loading: false,
    tabs: ['待报价', '已报价', '已接受', '已拒绝'],
    activeTab: 0,
  },

  onLoad() {
    this.loadQuotes();
  },

  onPullDownRefresh() {
    this.loadQuotes().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 切换标签
   */
  onTabChange(e: any) {
    const index = e.detail.index;
    this.setData({ activeTab: index });
    this.loadQuotes();
  },

  /**
   * 加载报价列表
   */
  async loadQuotes() {
    try {
      this.setData({ loading: true });

      let statusFilter: string[] = [];
      switch (this.data.activeTab) {
        case 0: // 待报价
          statusFilter = ['pending'];
          break;
        case 1: // 已报价
          statusFilter = ['quoted'];
          break;
        case 2: // 已接受
          statusFilter = ['confirmed', 'in_progress'];
          break;
        case 3: // 已拒绝
          statusFilter = ['cancelled'];
          break;
      }

      const result = await wx.cloud.callFunction({
        name: 'getMyQuotes',
        data: { status: statusFilter },
      });

      if (result.result.success) {
        this.setData({
          quotes: result.result.data?.quotes || [],
          loading: false,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载报价失败:', error);
      wx.showToast({
        title: '加载失败',
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
      url: `/pages/contractor/order-detail/order-detail?orderId=${orderId}`,
    });
  },

  /**
   * 提交报价
   */
  submitQuote(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/pages/contractor/submit-quote/submit-quote?orderId=${orderId}`,
    });
  },

  /**
   * 格式化日期
   */
  formatDate(date: Date | string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  /**
   * 获取状态文本
   */
  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '待报价',
      quoted: '已报价',
      confirmed: '已确认',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  },
});

