/**
 * 工人端任务详情页面
 */

Page({
  data: {
    taskId: '',
    task: null as any,
    loading: false,
    hasApplied: false, // 是否已申请
    applicationStatus: '', // 申请状态: pending, approved, rejected
    isTeamMember: false, // 是否已是团队成员
  },

  onLoad(options: any) {
    const { taskId } = options;
    if (taskId) {
      this.setData({ taskId });
      this.loadTaskDetail();
    }
  },

  onPullDownRefresh() {
    this.loadTaskDetail().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载任务详情
   */
  async loadTaskDetail() {
    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '加载中...' });

      const result = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: { orderId: this.data.taskId },
      });

      if (!result.result.success) {
        throw new Error(result.result.error || '获取任务详情失败');
      }

      const task = result.result.data?.order;
      if (!task) {
        throw new Error('任务不存在');
      }

      this.setData({
        task,
        loading: false,
      });

      // 检查申请状态（如果任务有工头）
      if (task && task.contractorId) {
        await this.checkApplicationStatus();
      } else {
        // 如果没有工头，重置申请状态
        this.setData({
          hasApplied: false,
          applicationStatus: '',
          isTeamMember: false,
        });
      }

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('加载任务详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 检查申请状态
   */
  async checkApplicationStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const { task } = this.data;
    if (!userInfo || !task || !task.contractorId) return;

    // 检查是否已是团队成员
    if (userInfo.contractorId === task.contractorId) {
      this.setData({ 
        isTeamMember: true, 
        applicationStatus: 'approved',
        hasApplied: true,
      });
      return;
    }

    try {
      const result = await wx.cloud.callFunction({
        name: 'getApplicationStatus',
        data: {
          workerId: userInfo._id,
          contractorId: task.contractorId,
        },
      });
      
      if (result.result.success && result.result.status) {
        this.setData({
          hasApplied: true,
          applicationStatus: result.result.status,
          isTeamMember: result.result.status === 'approved',
        });
      }
    } catch (error) {
      console.error('检查申请状态失败:', error);
    }
  },

  /**
   * 申请加入团队
   */
  async joinTeam() {
    const { task } = this.data;
    if (!task || !task.contractorId) {
      wx.showToast({ title: '任务信息不完整', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认申请',
      content: '确定要申请加入此工头的团队吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '提交中...' });
            const result = await wx.cloud.callFunction({
              name: 'joinTeam',
              data: {
                contractorId: task.contractorId,
                orderId: task._id,
                message: '申请加入您的团队',
              },
            });
            wx.hideLoading();
            
            if (result.result.success) {
              wx.showToast({ title: '申请已提交', icon: 'success' });
              this.setData({ 
                hasApplied: true, 
                applicationStatus: 'pending' 
              });
            } else {
              wx.showToast({ 
                title: result.result.error || '申请失败', 
                icon: 'none' 
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('申请加入团队失败:', error);
            wx.showToast({ title: '申请失败', icon: 'none' });
          }
        }
      },
    });
  },

  /**
   * 联系工头
   */
  async contactContractor() {
    const { task } = this.data;
    if (!task || !task.contractorId) {
      wx.showToast({
        title: '任务信息不完整',
        icon: 'none',
      });
      return;
    }

    try {
      // 获取工头信息
      const result = await wx.cloud.callFunction({
        name: 'getUserInfo',
        data: { userId: task.contractorId },
      });

      if (result.result.success && result.result.data?.user) {
        const contractor = result.result.data.user;
        
        // 显示联系方式选择
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
                fail: () => {
                  wx.showToast({
                    title: '拨打电话失败',
                    icon: 'none',
                  });
                },
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
          title: '获取工头信息失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('联系工头失败:', error);
      wx.showToast({
        title: '获取联系方式失败',
        icon: 'none',
      });
    }
  },

  /**
   * 取消申请
   */
  async cancelApplication() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消入队申请吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            // 调用云函数取消申请
            const result = await wx.cloud.callFunction({
              name: 'cancelTeamApplication',
              data: {
                contractorId: this.data.task.contractorId,
              },
            });
            wx.hideLoading();

            if (result.result.success) {
              wx.showToast({
                title: '已取消申请',
                icon: 'success',
              });
              this.setData({
                hasApplied: false,
                applicationStatus: '',
              });
            } else {
              wx.showToast({
                title: result.result.error || '取消失败',
                icon: 'none',
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('取消申请失败:', error);
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
   * 导航到工作地点
   */
  navigateToLocation() {
    const { task } = this.data;
    if (!task || !task.location) {
      wx.showToast({
        title: '地点信息不完整',
        icon: 'none',
      });
      return;
    }

    wx.openLocation({
      latitude: task.location.lat,
      longitude: task.location.lng,
      name: task.location.address || '工作地点',
      address: task.location.address,
      fail: (err) => {
        console.error('打开地图失败:', err);
        wx.showToast({
          title: '打开地图失败',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 查看地图位置
   */
  viewLocation() {
    const { task } = this.data;
    if (task && task.location) {
      wx.openLocation({
        latitude: task.location.lat,
        longitude: task.location.lng,
        name: '工作地点',
        address: task.location.address,
      });
    }
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
