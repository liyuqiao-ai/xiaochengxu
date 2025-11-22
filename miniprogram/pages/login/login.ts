/**
 * 登录页
 */

Page({
  data: {
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    loading: false,
    loginError: '',
    loginCode: '', // 保存登录 code
    loginType: 'wechat', // 登录方式：wechat 或 phone
    phone: '', // 手机号
    verifyCode: '', // 验证码
    countdown: 0, // 倒计时
    sendingCode: false, // 是否正在发送验证码
  },

  onLoad() {
    // 检查是否已登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      // 已登录，根据角色跳转
      const selectedRole = wx.getStorageSync('selectedRole');
      const role = selectedRole || userInfo.role;
      const roleRoutes: Record<string, string> = {
        farmer: '/farmer/pages/index/index',
        contractor: '/contractor/pages/index/index',
        worker: '/worker/pages/index/index',
        introducer: '/introducer/pages/index/index',
      };
      const route = roleRoutes[role] || '/pages/entry/entry';
      wx.reLaunch({ url: route });
    }
  },

  /**
   * 处理微信登录 - 先获取 code
   */
  wxLogin() {
    this.setData({ loading: true, loginError: '' });
    
    // 先获取 code
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('登录code:', res.code);
          // 保存 code，等待 getUserProfile 获取用户信息后一起发送
          this.setData({
            loginCode: res.code,
          });
        } else {
          console.log('登录失败: 未获取到 code');
          this.setData({
            loading: false,
            loginError: '获取登录凭证失败',
          });
          wx.showToast({
            title: '登录失败',
            icon: 'none',
          });
        }
      },
      fail: (err: any) => {
        console.error('wx.login 失败:', err);
        this.setData({
          loading: false,
          loginError: '获取登录凭证失败',
        });
        wx.showToast({
          title: '登录失败',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 获取用户信息 - 通过 getUserProfile 事件触发
   */
  async onGetUserProfile(event: any) {
    console.log('获取用户信息:', event);
    
    const { userInfo } = event.detail;
    const { loginCode } = this.data;
    
    if (!userInfo) {
      this.setData({
        loading: false,
        loginError: '需要授权用户信息才能使用完整功能',
      });
      wx.showToast({
        title: '需要授权用户信息',
        icon: 'none',
      });
      return;
    }

    if (!loginCode) {
      this.setData({
        loading: false,
        loginError: '登录凭证获取失败，请重试',
      });
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none',
      });
      return;
    }

    // 调用后端登录接口，同时传递 code 和用户信息
    await this.loginWithUserInfo(loginCode, userInfo);
  },

  /**
   * 使用 code 和用户信息调用云函数登录
   */
  async loginWithUserInfo(code: string, userInfo: any) {
    try {
      this.setData({ loading: true, loginError: '' });

      // 调用云函数登录
      const result = await wx.cloud.callFunction({
        name: 'loginUser',
        data: {
          code: code,
          userInfo: userInfo,
        },
      });

      if (result.result.success) {
        // 登录成功
        wx.setStorageSync('token', result.result.token);
        wx.setStorageSync('userInfo', result.result.userInfo);

        this.setData({ loading: false });

        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        // 跳转到入口页面
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/entry/entry' });
        }, 1000);
      } else {
        this.setData({
          loading: false,
          loginError: result.result.error || '登录失败',
        });
        wx.showToast({
          title: result.result.error || '登录失败',
          icon: 'none',
        });
      }
    } catch (error: any) {
      console.error('登录接口调用失败:', error);
      this.setData({
        loading: false,
        loginError: '网络错误，请重试',
      });
      wx.showToast({
        title: '网络错误',
        icon: 'none',
      });
    }
  },

  /**
   * 切换登录方式
   */
  switchLoginType(e: any) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      loginType: type,
      loginError: '',
      phone: '',
      verifyCode: '',
    });
  },

  /**
   * 输入手机号
   */
  onPhoneInput(e: any) {
    const value = e.detail.value.replace(/\D/g, ''); // 只保留数字
    if (value.length <= 11) {
      this.setData({ phone: value });
    }
  },

  /**
   * 输入验证码
   */
  onVerifyCodeInput(e: any) {
    const value = e.detail.value.replace(/\D/g, ''); // 只保留数字
    if (value.length <= 6) {
      this.setData({ verifyCode: value });
    }
  },

  /**
   * 发送验证码
   */
  async sendVerifyCode() {
    const { phone } = this.data;

    // 验证手机号
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none',
      });
      return;
    }

    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none',
      });
      return;
    }

    try {
      this.setData({ sendingCode: true });

      // 调用云函数发送验证码
      const result = await wx.cloud.callFunction({
        name: 'sendSMS',
        data: {
          phone: phone,
          type: 'login', // 登录验证码
        },
      });

      if (result.result.success) {
        wx.showToast({
          title: '验证码已发送',
          icon: 'success',
        });

        // 开始倒计时
        this.startCountdown();
      } else {
        wx.showToast({
          title: result.result.error || '发送失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      wx.showToast({
        title: '发送失败，请重试',
        icon: 'none',
      });
    } finally {
      this.setData({ sendingCode: false });
    }
  },

  /**
   * 开始倒计时
   */
  startCountdown() {
    let countdown = 60;
    this.setData({ countdown });

    const timer = setInterval(() => {
      countdown--;
      this.setData({ countdown });

      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({ countdown: 0 });
      }
    }, 1000);
  },

  /**
   * 手机号验证码登录
   */
  async phoneLogin() {
    const { phone, verifyCode } = this.data;

    // 验证输入
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none',
      });
      return;
    }

    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none',
      });
      return;
    }

    if (!verifyCode) {
      wx.showToast({
        title: '请输入验证码',
        icon: 'none',
      });
      return;
    }

    if (verifyCode.length !== 6) {
      wx.showToast({
        title: '请输入6位验证码',
        icon: 'none',
      });
      return;
    }

    try {
      this.setData({ loading: true, loginError: '' });

      // 调用云函数验证并登录
      const result = await wx.cloud.callFunction({
        name: 'phoneLogin',
        data: {
          phone: phone,
          verifyCode: verifyCode,
        },
      });

      if (result.result.success) {
        // 登录成功
        wx.setStorageSync('token', result.result.token);
        wx.setStorageSync('userInfo', result.result.userInfo);

        this.setData({ loading: false });

        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        // 跳转到入口页面
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/entry/entry' });
        }, 1000);
      } else {
        this.setData({
          loading: false,
          loginError: result.result.error || '登录失败',
        });
        wx.showToast({
          title: result.result.error || '登录失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('手机号登录失败:', error);
      this.setData({
        loading: false,
        loginError: '网络错误，请重试',
      });
      wx.showToast({
        title: '网络错误',
        icon: 'none',
      });
    }
  },
});

