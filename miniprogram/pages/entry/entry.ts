/**
 * 角色选择入口页面
 */

Page({
  data: {
    userInfo: null as any,
  },

  onLoad() {
    this.loadUserInfo();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
      // 如果已有角色，直接跳转
      this.redirectToRole(userInfo.role);
    }
  },

  /**
   * 选择角色
   */
  selectRole(e: any) {
    const role = e.currentTarget.dataset.role;
    const userInfo = this.data.userInfo;

    if (!userInfo) {
      // 未登录，先登录
      wx.reLaunch({
        url: '/pages/login/login',
      });
      return;
    }

    // 更新用户角色（如果需要）
    if (userInfo.role !== role) {
      // 可以调用云函数更新角色
      // 这里暂时直接跳转
    }

    this.redirectToRole(role);
  },

  /**
   * 根据角色跳转
   */
  redirectToRole(role: string) {
    switch (role) {
      case 'farmer':
        wx.reLaunch({
          url: '/farmer/pages/index/index',
        });
        break;
      case 'contractor':
        wx.reLaunch({
          url: '/contractor/pages/index/index',
        });
        break;
      case 'worker':
        wx.reLaunch({
          url: '/worker/pages/index/index',
        });
        break;
      case 'introducer':
        wx.reLaunch({
          url: '/introducer/pages/index/index',
        });
        break;
      default:
        // 未选择角色，显示选择界面
        break;
    }
  },

  /**
   * 去登录
   */
  goToLogin() {
    wx.reLaunch({
      url: '/pages/login/login',
    });
  },
});

