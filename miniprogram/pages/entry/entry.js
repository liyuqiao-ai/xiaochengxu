// pages/entry/entry.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
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
  selectRole(e) {
    console.log('selectRole被调用', e);
    
    if (!e || !e.currentTarget) {
      console.error('事件对象无效');
      wx.showToast({
        title: '点击无效，请重试',
        icon: 'none',
      });
      return;
    }

    const role = e.currentTarget.dataset.role;
    console.log('选择的角色:', role);

    if (!role) {
      console.error('角色数据无效');
      wx.showToast({
        title: '角色数据无效',
        icon: 'none',
      });
      return;
    }

    const userInfo = this.data.userInfo;

    // 如果未登录，直接跳转到对应角色页面（允许未登录访问，登录功能后续完善）
    if (!userInfo) {
      console.log('用户未登录，直接跳转到角色页面');
      // 保存选择的角色到本地
      wx.setStorageSync('selectedRole', role);
      // 直接跳转到对应角色页面
      this.redirectToRole(role);
      return;
    }

    // 更新用户角色（如果需要）
    if (userInfo.role !== role) {
      console.log('更新用户角色:', userInfo.role, '->', role);
      // 可以调用云函数更新角色
      // 这里暂时直接跳转
    }

    this.redirectToRole(role);
  },

  /**
   * 根据角色跳转
   * 严格按照要求：严格跳转到对应subPackage首页
   */
  redirectToRole(role) {
    console.log('redirectToRole被调用，角色:', role);
    
    // 严格按照多subPackages架构跳转
    const roleRoutes = {
      farmer: '/farmer/pages/index/index',
      contractor: '/contractor/pages/index/index',
      worker: '/worker/pages/index/index',
      introducer: '/introducer/pages/index/index',
    };

    const route = roleRoutes[role];
    if (!route) {
      console.error('无效的角色:', role);
      wx.showToast({
        title: '无效的角色',
        icon: 'none',
      });
      return;
    }

    console.log('准备跳转到:', route);

    // 使用navigateTo先尝试，如果失败再用reLaunch
    wx.navigateTo({
      url: route,
      success: () => {
        console.log('跳转成功:', route);
      },
      fail: (err) => {
        console.warn('navigateTo失败，尝试reLaunch:', err);
        // 如果navigateTo失败，可能是subPackage路径问题，使用reLaunch
        wx.reLaunch({
          url: route,
          success: () => {
            console.log('reLaunch跳转成功:', route);
          },
          fail: (reLaunchErr) => {
            console.error('跳转失败:', reLaunchErr);
            wx.showToast({
              title: '跳转失败: ' + (reLaunchErr.errMsg || '未知错误'),
              icon: 'none',
              duration: 3000,
            });
          },
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
