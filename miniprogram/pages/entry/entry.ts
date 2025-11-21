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
   * 严格按照要求：严格跳转到对应subPackage首页
   */
  redirectToRole(role: string) {
    // 严格按照多subPackages架构跳转
    const roleRoutes: Record<string, string> = {
      farmer: '/farmer/pages/index/index',
      contractor: '/contractor/pages/index/index',
      worker: '/worker/pages/index/index',
      introducer: '/introducer/pages/index/index',
    };

    const route = roleRoutes[role];
    if (!route) {
      wx.showToast({
        title: '无效的角色',
        icon: 'none',
      });
      return;
    }

    // 使用reLaunch确保完全跳转到subPackage
    wx.reLaunch({
      url: route,
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 去登录
   */
  goToLogin() {
    // 登录功能将在后续版本实现
    wx.showModal({
      title: '提示',
      content: '请先选择角色，登录功能将在后续版本实现',
      showCancel: false,
    });
  },
});

