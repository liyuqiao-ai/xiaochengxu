/**
 * 报价列表页面（农户查看所有报价）
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
        const order = orderResult.result.data?.order;
        this.setData({ order });

        // 如果有工头报价，显示报价信息
        if (order && order.contractorId && order.status === 'quoted') {
          // 获取工头信息
          const contractorResult = await wx.cloud.callFunction({
            name: 'getUserInfo',
            data: { userId: order.contractorId },
          });

          if (contractorResult.result.success) {
            const contractor = contractorResult.result.data?.user;
            const quotePrice = this.getQuotePrice(order);

            this.setData({
              quotes: [
                {
                  contractorId: order.contractorId,
                  contractorName: contractor?.nickName || '工头',
                  contractorAvatar: contractor?.avatarUrl || '',
                  creditScore: contractor?.creditScore || 0,
                  quotePrice,
                  quotedAt: order.timeline.quotedAt,
                },
              ],
            });
          }
        }
      }

      wx.hideLoading();
      this.setData({ loading: false });
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.hideLoading();
      this.setData({ loading: false });
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
    } else if (order.pricingMode === 'daily' && order.dailyInfo?.dailySalary) {
      return order.dailyInfo.dailySalary;
    } else if (order.pricingMode === 'monthly' && order.monthlyInfo?.monthlySalary) {
      return order.monthlyInfo.monthlySalary;
    }
    return 0;
  },

  /**
   * 接受报价
   */
  async acceptQuote(e: any) {
    const contractorId = e.currentTarget.dataset.contractorId;
    const orderId = this.data.orderId;
    const userInfo = wx.getStorageSync('userInfo');

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    wx.showModal({
      title: '确认接受',
      content: '确定要接受此报价吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            const result = await wx.cloud.callFunction({
              name: 'acceptQuote',
              data: {
                orderId,
                contractorId,
                farmerId: userInfo._id,
              },
            });

            wx.hideLoading();

            if (result.result.success) {
              wx.showToast({
                title: '接受成功',
                icon: 'success',
              });
              // 刷新数据
              this.loadData();
              // 跳转到订单详情页
              setTimeout(() => {
                wx.navigateTo({
                  url: `/farmer/pages/order-detail/order-detail?orderId=${orderId}`,
                });
              }, 1500);
            } else {
              wx.showToast({
                title: result.result.error || '接受失败',
                icon: 'none',
              });
            }
          } catch (error) {
            console.error('接受报价失败:', error);
            wx.hideLoading();
            wx.showToast({
              title: '接受失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  /**
   * 查看工头详情
   */
  viewContractorDetail(e: any) {
    const contractorId = e.currentTarget.dataset.contractorId;
    // 可以跳转到工头详情页（如果存在）
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  /**
   * 拒绝报价
   */
  async rejectQuote(e: any) {
    const contractorId = e.currentTarget.dataset.contractorId;
    const orderId = this.data.orderId;

    wx.showModal({
      title: '确认拒绝',
      content: '确定要拒绝此报价吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            // 调用云函数拒绝报价（将订单状态改回pending，允许其他工头报价）
            const result = await wx.cloud.callFunction({
              name: 'rejectQuote',
              data: {
                orderId,
                contractorId,
              },
            });

            wx.hideLoading();

            if (result.result.success) {
              wx.showToast({
                title: '已拒绝报价',
                icon: 'success',
              });
              // 刷新数据
              this.loadData();
            } else {
              wx.showToast({
                title: result.result.error || '操作失败',
                icon: 'none',
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('拒绝报价失败:', error);
            wx.showToast({
              title: '操作失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  /**
   * 联系工头
   */
  async contactContractor(e: any) {
    const contractorId = e.currentTarget.dataset.contractorId;

    try {
      wx.showLoading({ title: '获取联系方式...' });

      const result = await wx.cloud.callFunction({
        name: 'getUserInfo',
        data: { userId: contractorId },
      });

      wx.hideLoading();

      if (result.result.success && result.result.data?.user) {
        const contractor = result.result.data.user;
        const contactMethods: string[] = [];

        if (contractor.phone) {
          contactMethods.push('电话');
        }
        if (contractor.wechat) {
          contactMethods.push('微信');
        }

        if (contactMethods.length === 0) {
          wx.showToast({
            title: '工头未设置联系方式',
            icon: 'none',
          });
          return;
        }

        wx.showActionSheet({
          itemList: contactMethods,
          success: (res) => {
            const method = contactMethods[res.tapIndex];
            if (method === '电话' && contractor.phone) {
              wx.makePhoneCall({
                phoneNumber: contractor.phone,
              });
            } else if (method === '微信' && contractor.wechat) {
              wx.setClipboardData({
                data: contractor.wechat,
                success: () => {
                  wx.showToast({
                    title: '微信号已复制',
                    icon: 'success',
                  });
                },
              });
            }
          },
        });
      } else {
        wx.showToast({
          title: '获取联系方式失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('联系工头失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none',
      });
    }
  },

  /**
   * 查看订单详情
   */
  viewOrderDetail() {
    wx.navigateTo({
      url: `/farmer/pages/order-detail/order-detail?orderId=${this.data.orderId}`,
    });
  },
});

