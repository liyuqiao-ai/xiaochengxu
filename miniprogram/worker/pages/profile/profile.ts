/**
 * 工人端个人中心页面
 */

Page({
  data: {
    userInfo: null as any,
    stats: {
      totalTasks: 0,
      completedTasks: 0,
      totalIncome: 0,
      creditScore: 0,
    },
  },

  onLoad() {
    this.loadUserInfo();
    this.loadStats();
  },

  onShow() {
    this.loadUserInfo();
    this.loadStats();
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
   * 加载统计数据
   */
  async loadStats() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getWorkerStats',
        data: {},
      });

      if (result.result.success) {
        this.setData({
          stats: result.result.data?.stats || this.data.stats,
        });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  /**
   * 编辑资料
   */
  editProfile() {
    wx.navigateTo({
      url: '/pages/worker/edit-profile/edit-profile',
    });
  },

  /**
   * 我的收入
   */
  viewIncome() {
    wx.navigateTo({
      url: '/pages/worker/income/income',
    });
  },

  /**
   * 我的任务
   */
  viewMyTasks() {
    wx.navigateTo({
      url: '/pages/worker/my-tasks/my-tasks',
    });
  },

  /**
   * 技能管理
   */
  manageSkills() {
    wx.navigateTo({
      url: '/pages/worker/skills/skills',
    });
  },

  /**
   * 设置
   */
  goToSettings() {
    wx.navigateTo({
      url: '/pages/worker/settings/settings',
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

