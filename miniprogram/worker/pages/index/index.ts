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
    } else {
      // 未登录，跳转到登录页
      wx.reLaunch({
        url: '/pages/login/login',
      });
      return;
    }
  },

  /**
   * 加载任务列表
   */
  async loadTasks() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      return;
    }

    try {
      this.setData({ loading: true });

      // 获取用户位置
      let location: any = null;
      try {
        location = await this.getLocation();
      } catch (error) {
        console.warn('获取位置失败:', error);
        // 位置获取失败不影响加载任务，使用默认值
      }

      // 获取附近任务
      if (location) {
        const nearbyResult = await wx.cloud.callFunction({
          name: 'getNearbyTasks',
          data: {
            lat: location.latitude,
            lng: location.longitude,
            radius: 50, // 50公里
          },
        });

        if (nearbyResult.result.success) {
          this.setData({
            nearbyTasks: nearbyResult.result.data?.tasks || [],
          });
        } else {
          this.setData({
            nearbyTasks: [],
          });
        }
      } else {
        this.setData({
          nearbyTasks: [],
        });
      }

      // 获取我的任务
      try {
        const myTasksResult = await wx.cloud.callFunction({
          name: 'getMyTasks',
          data: {},
        });

        if (myTasksResult.result.success) {
          this.setData({
            myTasks: myTasksResult.result.data?.tasks || [],
          });
        } else {
          this.setData({
            myTasks: [],
          });
        }
      } catch (error) {
        console.error('获取我的任务失败:', error);
        this.setData({
          myTasks: [],
        });
      }

      this.setData({ loading: false });
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载任务失败:', error);
      // 出错时显示空状态
      this.setData({
        nearbyTasks: [],
        myTasks: [],
      });
    }
  },

  /**
   * 获取位置信息
   */
  getLocation(): Promise<any> {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject,
      });
    });
  },

  /**
   * 查看任务大厅
   */
  viewTaskList() {
    wx.navigateTo({
      url: '/worker/pages/task-list/task-list',
    });
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
   * 加入团队
   */
  joinTeam(e: any) {
    const contractorId = e.currentTarget.dataset.contractorId;
    wx.navigateTo({
      url: `/pages/worker/join-team/join-team?contractorId=${contractorId}`,
    });
  },
});

