/**
 * 工人端任务列表页面
 */

Page({
  data: {
    tasks: [] as any[],
    loading: false,
    location: null as any,
  },

  onLoad() {
    this.getLocation();
    this.loadTasks();
  },

  onShow() {
    this.loadTasks();
  },

  onPullDownRefresh() {
    this.loadTasks().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 获取位置
   */
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: {
            lat: res.latitude,
            lng: res.longitude,
          },
        });
        this.loadTasks();
      },
      fail: () => {
        wx.showToast({
          title: '获取位置失败',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 加载任务列表
   */
  async loadTasks() {
    try {
      this.setData({ loading: true });

      const result = await wx.cloud.callFunction({
        name: 'getNearbyTasks',
        data: {
          location: this.data.location,
          maxDistance: 50, // 50公里
        },
      });

      if (result.result.success) {
        this.setData({
          tasks: result.result.data?.tasks || [],
          loading: false,
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: result.result.error || '加载失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('加载任务失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 查看任务详情
   */
  viewTaskDetail(e: any) {
    const taskId = e.currentTarget.dataset.taskId;
    wx.navigateTo({
      url: `/worker/pages/task-detail/task-detail?taskId=${taskId}`,
    });
  },

  /**
   * 查看地图位置
   */
  viewLocation(e: any) {
    const location = e.currentTarget.dataset.location;
    if (location) {
      wx.openLocation({
        latitude: location.lat,
        longitude: location.lng,
        name: location.address || '工作地点',
      });
    }
  },
});

