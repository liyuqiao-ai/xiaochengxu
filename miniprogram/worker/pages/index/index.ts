/**
 * 工人端首页
 */

Page({
  data: {
    userInfo: null as any,
    nearbyTasks: [] as any[],
    myTasks: [] as any[],
    loading: false,
  },

  onLoad() {
    this.loadUserInfo();
    this.loadTasks();
  },

  onPullDownRefresh() {
    this.loadTasks().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  /**
   * 加载任务列表
   */
  async loadTasks() {
    try {
      this.setData({ loading: true });

      // 获取附近任务
      const nearbyResult = await wx.cloud.callFunction({
        name: 'getNearbyTasks',
        data: {},
      });

      // 获取我的任务
      const myTasksResult = await wx.cloud.callFunction({
        name: 'getMyTasks',
        data: {},
      });

      if (nearbyResult.result.success) {
        this.setData({
          nearbyTasks: nearbyResult.result.data?.tasks || [],
        });
      }

      if (myTasksResult.result.success) {
        this.setData({
          myTasks: myTasksResult.result.data?.tasks || [],
        });
      }

      this.setData({ loading: false });
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载任务失败:', error);
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
      url: `/pages/worker/task-detail/task-detail?taskId=${taskId}`,
    });
  },

  /**
   * 加入团队
   */
  joinTeam(e: any) {
    const contractorId = e.currentTarget.dataset.contractorId;
    wx.navigateTo({
      url: `/pages/worker/join-team/join-team?contractorId=${contractorId}`,
    });
  },
});

