/**
 * 角色选择入口页面
 */

Page({
  data: {
    userInfo: null as any,
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    if (userInfo && token) {
      // 已登录用户直接跳转到对应角色工作台
      this.setData({ userInfo });
      this.redirectToRole(userInfo.role);
    } else {
      this.loadUserInfo();
    }
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
        title: '权限提示',
        content: `您当前的角色是未登录，无法访问${this.getRoleName(role)}端`,
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login',
          });
        },
      });
      return;
    }

    // 验证用户角色权限
    if (userInfo.role && userInfo.role !== role) {
      wx.showModal({
        title: '权限提示',
        content: `您当前的角色是${this.getRoleName(userInfo.role)}，无法访问${this.getRoleName(role)}端`,
        showCancel: false,
        success: () => {
          wx.navigateTo({
            url: '/pages/login/login',
          });
        },
      });
      return;
    }

    // 根据角色跳转到对应工作台
    switch (role) {
      case 'farmer':
        wx.reLaunch({ url: '/farmer/pages/index/index' });
        break;
      case 'worker':
        wx.reLaunch({ url: '/worker/pages/index/index' });
        break;
      case 'contractor':
        wx.reLaunch({ url: '/contractor/pages/index/index' });
        break;
      case 'introducer':
        wx.reLaunch({ url: '/introducer/pages/index/index' });
        break;
      default:
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
    // 登录功能将在后续版本实现
    wx.showModal({
      title: '提示',
      content: '请先选择角色，登录功能将在后续版本实现',
      showCancel: false,
    });
  },
});

