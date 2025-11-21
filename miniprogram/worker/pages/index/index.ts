/**
 * 工人端首页
 */

Page({
  data: {
    userInfo: null as any,
    nearbyTasks: [] as any[],
    myTasks: [] as any[],
    stats: {
      nearbyTasksCount: 0,
      myTasksCount: 0,
      todayIncome: 0, // 今日收入
    },
    loading: false,
  },

  onLoad() {
    // 先检查登录状态和角色权限
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.reLaunch({
        url: '/pages/login/login',
      });
      return;
    }

    // 验证角色权限
    if (userInfo.role !== 'worker') {
      wx.showModal({
        title: '提示',
        content: '您不是工人，无法访问此页面',
        showCancel: false,
        success: () => {
          wx.reLaunch({
            url: '/pages/entry/entry',
          });
        },
      });
      return;
    }

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
          const tasks = nearbyResult.result.data?.tasks || [];
          this.setData({
            nearbyTasks: tasks,
            'stats.nearbyTasksCount': tasks.length,
          });
        } else {
          this.setData({
            nearbyTasks: [],
            'stats.nearbyTasksCount': 0,
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
          const tasks = myTasksResult.result.data?.tasks || [];
          this.setData({
            myTasks: tasks,
            'stats.myTasksCount': tasks.length,
          });
        } else {
          this.setData({
            myTasks: [],
            'stats.myTasksCount': 0,
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

