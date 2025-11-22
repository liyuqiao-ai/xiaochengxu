/**
 * 角色选择入口页面
 */

Page({
  data: {
    userInfo: null as any,
    showLoginTip: false,
  },

  onLoad() {
    // 检查用户是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    if (userInfo && token) {
      // 已登录用户直接跳转到对应角色
      this.setData({ userInfo });
      this.redirectToRole(userInfo.role);
      return;
    }

    // 未登录用户显示登录提示
    this.setData({ showLoginTip: true });
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
   * 根据角色跳转（带权限验证）
   * 严格按照要求：严格跳转到对应subPackage首页
   */
  redirectToRole(role: string) {
    const userInfo = wx.getStorageSync('userInfo');
    
    // 验证用户是否登录
    if (!userInfo) {
      wx.showModal({
        title: '请先登录',
        content: '需要登录后才能使用该功能',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        },
      });
      return;
    }

    // 验证用户角色权限
    if (userInfo.role !== role) {
      wx.showModal({
        title: '权限不足',
        content: `您的账户角色为${this.getRoleName(userInfo.role)}，无法访问${this.getRoleName(role)}端功能`,
        showCancel: false,
      });
      return;
    }

    // 根据角色跳转
    const rolePaths: Record<string, string> = {
      farmer: '/farmer/pages/index/index',
      worker: '/worker/pages/index/index',
      contractor: '/contractor/pages/index/index',
      introducer: '/introducer/pages/index/index',
    };

    const targetPath = rolePaths[role];
    if (targetPath) {
      wx.reLaunch({ url: targetPath });
    } else {
      wx.showToast({
        title: '无效的角色',
        icon: 'none',
      });
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

