/**
 * 农户端订单详情页面
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
   * 接受报价
   */
  async acceptQuote() {
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
        // 刷新订单详情
        this.loadOrderDetail();
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
   * 取消订单
   */
  async cancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消此订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            const result = await wx.cloud.callFunction({
              name: 'cancelOrder',
              data: {
                orderId: this.data.orderId,
                reason: '用户取消',
              },
            });

            wx.hideLoading();

            if (result.result.success) {
              wx.showToast({
                title: '取消成功',
                icon: 'success',
              });
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              wx.showToast({
                title: result.result.error || '取消失败',
                icon: 'none',
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('取消订单失败:', error);
            wx.showToast({
              title: '取消失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  /**
   * 确认工作量
   */
  async confirmWorkload() {
    wx.showModal({
      title: '确认工作量',
      content: '请确认实际工作量是否与工头提交的一致',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            // 获取订单的实际工作量（从订单中获取）
            const order = this.data.order;
            if (!order || !order.actualWorkload) {
              wx.showToast({
                title: '请先等待工头提交工作量',
                icon: 'none',
              });
              return;
            }

            const result = await wx.cloud.callFunction({
              name: 'confirmWorkload',
              data: {
                orderId: this.data.orderId,
                actualWorkload: order.actualWorkload,
                confirmedBy: 'farmer',
              },
            });

            wx.hideLoading();

            if (result.result.success) {
              wx.showToast({
                title: '确认成功',
                icon: 'success',
              });
              this.loadOrderDetail();
            } else {
              wx.showToast({
                title: result.result.error || '确认失败',
                icon: 'none',
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('确认工作量失败:', error);
            wx.showToast({
              title: '确认失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  /**
   * 开始工作
   */
  async startWork() {
    try {
      wx.showLoading({ title: '处理中...' });

      const result = await wx.cloud.callFunction({
        name: 'startWork',
        data: {
          orderId: this.data.orderId,
        },
      });

      wx.hideLoading();

      if (result.result.success) {
        wx.showToast({
          title: '已开始工作',
          icon: 'success',
        });
        this.loadOrderDetail();
      } else {
        wx.showToast({
          title: result.result.error || '操作失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('开始工作失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none',
      });
    }
  },

  /**
   * 去支付
   */
  goToPayment() {
    wx.navigateTo({
      url: `/pages/farmer/payment/payment?orderId=${this.data.orderId}`,
    });
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

