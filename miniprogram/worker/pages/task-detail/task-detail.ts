/**
 * 工人端任务详情页面
 */

Page({
  data: {
    taskId: '',
    task: null as any,
    loading: false,
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
   * 加入团队
   */
  async joinTeam() {
    const { task } = this.data;
    if (!task || !task.contractorId) {
      wx.showToast({
        title: '任务信息不完整',
        icon: 'none',
      });
      return;
    }

    try {
      wx.showLoading({ title: '处理中...' });

      const result = await wx.cloud.callFunction({
        name: 'joinTeam',
        data: {
          contractorId: task.contractorId,
          orderId: task._id,
        },
      });

      wx.hideLoading();

      if (result.result.success) {
        wx.showToast({
          title: '加入成功',
          icon: 'success',
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.error || '加入失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加入团队失败:', error);
      wx.showToast({
        title: '加入失败',
        icon: 'none',
      });
    }
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

