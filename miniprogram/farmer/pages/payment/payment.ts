/**
 * 支付页面
 */

Page({
  data: {
    orderId: '',
    order: null as any,
    paymentParams: null as any,
    loading: false,
  },

  onLoad(options: any) {
    const { orderId } = options;
    if (orderId) {
      this.setData({ orderId });
      this.loadOrderDetail();
    }
  },

  /**
   * 加载订单详情
   */
  async loadOrderDetail() {
    try {
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

      this.setData({ order });
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('加载订单详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 创建支付订单
   */
  async createPayment() {
    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '创建支付中...' });

      const result = await wx.cloud.callFunction({
        name: 'createPayment',
        data: { orderId: this.data.orderId },
      });

      wx.hideLoading();

      if (!result.result.success) {
        throw new Error(result.result.error || '创建支付订单失败');
      }

      const paymentParams = result.result.data?.paymentParams;
      if (!paymentParams) {
        throw new Error('支付参数获取失败');
      }

      this.setData({
        paymentParams,
        loading: false,
      });

      // 发起支付
      this.requestPayment();
    } catch (error: any) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('创建支付订单失败:', error);
      wx.showToast({
        title: error.message || '创建支付失败',
        icon: 'none',
      });
    }
  },

  /**
   * 发起微信支付
   */
  requestPayment() {
    const { paymentParams } = this.data;
    if (!paymentParams) {
      wx.showToast({
        title: '支付参数错误',
        icon: 'none',
      });
      return;
    }

    wx.requestPayment({
      timeStamp: paymentParams.timeStamp,
      nonceStr: paymentParams.nonceStr,
      package: paymentParams.package,
      signType: paymentParams.signType,
      paySign: paymentParams.paySign,
      success: () => {
        wx.showToast({
          title: '支付成功',
          icon: 'success',
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      },
      fail: (err) => {
        console.error('支付失败:', err);
        wx.showToast({
          title: '支付失败',
          icon: 'none',
        });
      },
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

