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
      priceRange: '', // 价格范围
    },
    location: null as any,
    jobTypes: [
      { value: '', name: '全部工种' },
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
    distanceOptions: ['距离最近', '距离最远', '时间最新', '时间最早'],
    distanceIndex: 0,
    priceRanges: ['全部', '0-1000元', '1000-5000元', '5000-10000元', '10000元以上'],
    priceIndex: 0,
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
  onJobTypeChange(e: any) {
    const index = parseInt(e.detail.value);
    const jobType = this.data.jobTypes[index].value;
    this.setData({
      jobTypeIndex: index,
      'filters.jobType': jobType,
    });
    this.loadOrders();
  },

  /**
   * 距离排序
   */
  onDistanceChange(e: any) {
    const index = parseInt(e.detail.value);
    this.setData({
      distanceIndex: index,
    });
    // 根据选择排序
    this.sortOrders();
  },

  /**
   * 价格筛选
   */
  onPriceChange(e: any) {
    const index = parseInt(e.detail.value);
    this.setData({
      priceIndex: index,
    });
    // 解析价格范围
    const priceRange = this.data.priceRanges[index];
    this.setData({
      'filters.priceRange': priceRange,
    });
    this.loadOrders();
  },

  /**
   * 清除筛选
   */
  clearFilters() {
    this.setData({
      jobTypeIndex: 0,
      pricingModeIndex: 0,
      distanceIndex: 0,
      priceIndex: 0,
      filters: {
        jobType: '',
        pricingMode: '',
        maxDistance: 50,
        priceRange: '',
      },
    });
    this.loadOrders();
  },

  /**
   * 排序订单
   */
  sortOrders() {
    const { orders, distanceIndex } = this.data;
    let sortedOrders = [...orders];

    switch (distanceIndex) {
      case 0: // 距离最近
        sortedOrders.sort((a: any, b: any) => {
          const distA = a.distance || 999999;
          const distB = b.distance || 999999;
          return distA - distB;
        });
        break;
      case 1: // 距离最远
        sortedOrders.sort((a: any, b: any) => {
          const distA = a.distance || 0;
          const distB = b.distance || 0;
          return distB - distA;
        });
        break;
      case 2: // 时间最新
        sortedOrders.sort((a: any, b: any) => {
          const timeA = new Date(a.timeline.createdAt).getTime();
          const timeB = new Date(b.timeline.createdAt).getTime();
          return timeB - timeA;
        });
        break;
      case 3: // 时间最早
        sortedOrders.sort((a: any, b: any) => {
          const timeA = new Date(a.timeline.createdAt).getTime();
          const timeB = new Date(b.timeline.createdAt).getTime();
          return timeA - timeB;
        });
        break;
    }

    this.setData({ orders: sortedOrders });
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

