/**
 * 工头端需求列表页面
 */

Page({
  data: {
    orders: [] as any[],
    loading: false,
    filters: {
      jobType: '',
      pricingMode: '',
      maxDistance: 50, // 最大距离（公里）
    },
    location: null as any,
    jobTypes: [
      { value: '', name: '全部' },
      { value: 'harvest', name: '收割' },
      { value: 'plant', name: '种植' },
      { value: 'fertilize', name: '施肥' },
      { value: 'pesticide', name: '打药' },
      { value: 'weeding', name: '除草' },
      { value: 'management', name: '管理' },
    ],
    jobTypeIndex: 0,
    pricingModes: [
      { value: '', name: '全部' },
      { value: 'piece', name: '记件' },
      { value: 'daily', name: '按天' },
      { value: 'monthly', name: '包月' },
    ],
    pricingModeIndex: 0,
  },

  onLoad() {
    this.getLocation();
    this.loadOrders();
  },

  onShow() {
    // 每次显示时刷新
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.loadOrders().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 获取位置
   */
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: {
            lat: res.latitude,
            lng: res.longitude,
          },
        });
      },
      fail: () => {
        wx.showToast({
          title: '获取位置失败',
          icon: 'none',
        });
      },
    });
  },

  /**
   * 加载订单列表
   */
  async loadOrders() {
    try {
      this.setData({ loading: true });

      const result = await wx.cloud.callFunction({
        name: 'getPendingOrders',
        data: {
          filters: this.data.filters,
          location: this.data.location,
        },
      });

      if (result.result.success) {
        this.setData({
          orders: result.result.data?.orders || [],
          loading: false,
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({
          title: result.result.error || '加载失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('加载订单失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 筛选工种
   */
  filterJobType(e: any) {
    const index = parseInt(e.detail.value);
    const jobType = this.data.jobTypes[index].value;
    this.setData({
      jobTypeIndex: index,
      'filters.jobType': jobType,
    });
    this.loadOrders();
  },

  /**
   * 筛选计价模式
   */
  filterPricingMode(e: any) {
    const index = parseInt(e.detail.value);
    const pricingMode = this.data.pricingModes[index].value;
    this.setData({
      pricingModeIndex: index,
      'filters.pricingMode': pricingMode,
    });
    this.loadOrders();
  },

  /**
   * 查看订单详情并报价
   */
  viewOrderDetail(e: any) {
    const orderId = e.currentTarget.dataset.orderId;
    wx.navigateTo({
      url: `/contractor/pages/submit-quote/submit-quote?orderId=${orderId}`,
    });
  },

  /**
   * 查看地图位置
   */
  viewLocation(e: any) {
    const location = e.currentTarget.dataset.location;
    if (location) {
      wx.openLocation({
        latitude: location.lat,
        longitude: location.lng,
        name: location.address || '工作地点',
      });
    }
  },
});

