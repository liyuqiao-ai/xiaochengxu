/**
 * 订单详情页面
 */

Page({
  data: {
    orderId: '',
    order: null as any,
    loading: false,
  },

  onLoad(options: any) {
    const { orderId } = options;
    if (orderId) {
      this.setData({ orderId });
      this.loadOrderDetail();
    }
  },

  onPullDownRefresh() {
    this.loadOrderDetail().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载订单详情
   */
  async loadOrderDetail() {
    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '加载中...' });

      const result = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: { orderId: this.data.orderId },
      });

      if (!result.result.success) {
        throw new Error(result.result.error || '获取订单详情失败');
      }

      const order = result.result.data?.order;
      if (!order) {
        throw new Error('订单不存在');
      }

      this.setData({
        order,
        loading: false,
      });

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('加载订单详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 查看地图位置
   */
  viewLocation() {
    const { order } = this.data;
    if (order && order.location) {
      wx.openLocation({
        latitude: order.location.lat,
        longitude: order.location.lng,
        name: '工作地点',
        address: order.location.address,
      });
    }
  },

  /**
   * 开始报价
   */
  startQuote() {
    wx.navigateTo({
      url: `/pages/contractor/submit-quote/submit-quote?orderId=${this.data.orderId}`,
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

