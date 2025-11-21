/**
 * 提交报价页面
 */

Page({
  data: {
    orderId: '',
    order: null as any,
    quotePrice: 0,
    suggestedPrice: 0, // 智能报价建议
    pricingMode: 'piece' as 'piece' | 'daily' | 'monthly',
    loading: false,
    quoteHistory: [] as any[], // 报价历史
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

      this.setData({
        order,
        pricingMode: order.pricingMode,
      });

      // 计算智能报价建议
      this.calculateSuggestedPrice(order);

      // 加载报价历史（如果有）
      this.loadQuoteHistory();

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
   * 输入报价金额
   */
  onQuotePriceInput(e: any) {
    const value = parseFloat(e.detail.value) || 0;
    this.setData({ quotePrice: value });
  },

  /**
   * 提交报价
   */
  async submitQuote() {
    const { orderId, quotePrice, order } = this.data;

    // 验证报价金额
    if (!quotePrice || quotePrice <= 0) {
      wx.showToast({
        title: '请输入有效的报价金额',
        icon: 'none',
      });
      return;
    }

    // 验证订单信息
    if (!order) {
      wx.showToast({
        title: '订单信息加载中，请稍候',
        icon: 'none',
      });
      return;
    }

    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '提交中...' });

      const result = await wx.cloud.callFunction({
        name: 'submitQuote',
        data: {
          orderId,
          quotePrice: Math.round(quotePrice * 100), // 转换为分
        },
      });

      wx.hideLoading();
      this.setData({ loading: false });

      if (result.result.success) {
        wx.showToast({
          title: '报价成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.error || '报价失败',
          icon: 'none',
        });
      }
    } catch (error: any) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('提交报价失败:', error);
      wx.showToast({
        title: '报价失败',
        icon: 'none',
      });
    }
  },

  /**
   * 计算智能报价建议
   */
  calculateSuggestedPrice(order: any) {
    // 基于历史数据或市场价格的简单建议
    // 这里可以根据实际业务逻辑优化
    let suggested = 0;

    if (order.pricingMode === 'piece') {
      // 记件模式：根据工种和单位给出建议单价
      const basePrice: Record<string, number> = {
        harvest: 50, // 收割：50元/亩
        plant: 40,    // 种植：40元/亩
        fertilize: 30, // 施肥：30元/亩
        pesticide: 35, // 打药：35元/亩
        weeding: 25,   // 除草：25元/亩
        management: 0,
      };
      suggested = basePrice[order.jobType] || 30;
    } else if (order.pricingMode === 'daily') {
      // 按天模式：建议日薪
      suggested = 150; // 150元/人/天
    } else if (order.pricingMode === 'monthly') {
      // 包月模式：建议月薪
      suggested = 3000; // 3000元/人/月
    }

    this.setData({ suggestedPrice: suggested });
  },

  /**
   * 加载报价历史
   */
  async loadQuoteHistory() {
    // TODO: 可以调用云函数获取历史报价数据
    // 用于参考和对比
    this.setData({ quoteHistory: [] });
  },

  /**
   * 使用建议价格
   */
  useSuggestedPrice() {
    this.setData({ quotePrice: this.data.suggestedPrice });
  },

  /**
   * 格式化金额显示（分转元）
   */
  formatAmount(fen: number): string {
    return (fen / 100).toFixed(2);
  },
});

