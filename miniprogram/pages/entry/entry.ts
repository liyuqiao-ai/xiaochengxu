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

    // 检查登录状态
    if (!userInfo) {
      // 未登录，保存选择的角色，跳转到登录页
      wx.setStorageSync('selectedRole', role);
      wx.reLaunch({
        url: '/pages/login/login',
      });
      return;
    }

    // 已登录，验证角色匹配
    if (userInfo.role && userInfo.role !== role) {
      wx.showModal({
        title: '提示',
        content: `您的角色是${this.getRoleName(userInfo.role)}，无法进入${this.getRoleName(role)}端`,
        showCancel: false,
        confirmText: '确定',
      });
      return;
    }

    this.redirectToRole(role);
  },

  /**
   * 获取角色名称
   */
  getRoleName(role: string): string {
    const roleNames: Record<string, string> = {
      farmer: '农户',
      contractor: '工头',
      worker: '工人',
      introducer: '介绍方',
    };
    return roleNames[role] || role;
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

