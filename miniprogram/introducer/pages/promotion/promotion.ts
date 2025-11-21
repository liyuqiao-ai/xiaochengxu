/**
 * 介绍方推广页面
 */

Page({
  data: {
    userInfo: null as any,
    promotionCode: '',
    qrCodeUrl: '',
    loading: false,
  },

  onLoad() {
    this.loadUserInfo();
    this.loadPromotionCode();
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
   * 加载推广码
   */
  async loadPromotionCode() {
    try {
      const userInfo = this.data.userInfo;
      if (!userInfo || userInfo.role !== 'introducer') {
        return;
      }

      // 从用户信息获取推广码
      if (userInfo.promotionCode) {
        this.setData({
          promotionCode: userInfo.promotionCode,
        });
        this.generateQRCode();
      }
    } catch (error) {
      console.error('加载推广码失败:', error);
    }
  },

  /**
   * 生成二维码
   */
  async generateQRCode() {
    try {
      this.setData({ loading: true });

      const result = await wx.cloud.callFunction({
        name: 'generateQRCode',
        data: {
          scene: `promotion_${this.data.promotionCode}`,
          page: 'pages/entry/entry',
        },
      });

      if (result.result.success) {
        this.setData({
          qrCodeUrl: result.result.data?.qrCodeUrl || '',
          loading: false,
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('生成二维码失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 复制推广码
   */
  copyPromotionCode() {
    wx.setClipboardData({
      data: this.data.promotionCode,
      success: () => {
        wx.showToast({
          title: '推广码已复制',
          icon: 'success',
        });
      },
    });
  },

  /**
   * 分享推广
   */
  sharePromotion() {
    wx.showShareMenu({
      withShareTicket: true,
    });
  },
});

