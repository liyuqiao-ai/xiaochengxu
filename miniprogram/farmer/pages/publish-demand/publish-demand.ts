/**
 * 发布需求页面
 */

import { JobType, PricingMode } from '../../../../shared/types/order';

Page({
  data: {
    jobType: 'harvest' as JobType,
    pricingMode: 'piece' as PricingMode,
    location: null as any,
    formData: {
      // 记件模式
      unit: 'acre',
      estimatedQuantity: 0,
      // 按天模式
      estimatedWorkers: 1,
      estimatedDays: 1,
      // 包月模式
      estimatedMonths: 1,
    },
  },

  onLoad() {
    // 获取用户位置
    this.getLocation();
  },

  /**
   * 获取位置信息
   */
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: async (res) => {
        // 逆地理编码获取地址
        try {
          // 使用腾讯地图API进行逆地理编码
          // 注意：需要在小程序管理后台配置request合法域名
          const mapKey = 'YOUR_TENCENT_MAP_KEY'; // 需要在配置中设置
          const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${res.latitude},${res.longitude}&key=${mapKey}&get_poi=1`;

          // 由于小程序限制，这里使用云函数调用
          const result = await wx.cloud.callFunction({
            name: 'reverseGeocode',
            data: {
              latitude: res.latitude,
              longitude: res.longitude,
            },
          });

          let address = '位置获取中...';
          if (result.result.success && result.result.data?.address) {
            address = result.result.data.address;
          } else {
            // 如果云函数调用失败，使用默认地址
            address = `${res.latitude.toFixed(6)}, ${res.longitude.toFixed(6)}`;
          }

          this.setData({
            location: {
              lat: res.latitude,
              lng: res.longitude,
              address,
            },
          });
        } catch (error) {
          console.error('获取地址失败:', error);
          // 如果获取地址失败，使用坐标作为地址
          this.setData({
            location: {
              lat: res.latitude,
              lng: res.longitude,
              address: `${res.latitude.toFixed(6)}, ${res.longitude.toFixed(6)}`,
            },
          });
        }
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
   * 选择工种
   */
  onJobTypeChange(e: any) {
    this.setData({
      jobType: e.detail.value,
    });
  },

  /**
   * 选择计价模式
   */
  onPricingModeChange(e: any) {
    this.setData({
      pricingMode: e.detail.value,
    });
  },

  /**
   * 提交需求
   */
  async submitDemand() {
    const demandData = this.prepareDemandData();

    if (!demandData) {
      wx.showToast({
        title: '请完善需求信息',
        icon: 'none',
      });
      return;
    }

    try {
      // 获取用户信息
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || userInfo.role !== 'farmer') {
        wx.showToast({
          title: '只有农户可以发布需求',
          icon: 'none',
        });
        return;
      }

      const result = await wx.cloud.callFunction({
        name: 'createOrder',
        data: {
          ...demandData,
          farmerId: userInfo._id,
        },
      });

      if (result.result.success) {
        wx.showToast({
          title: '发布成功',
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.error || '发布失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('发布需求失败:', error);
      wx.showToast({
        title: '发布失败',
        icon: 'none',
      });
    }
  },

  /**
   * 准备需求数据
   */
  prepareDemandData() {
    if (!this.data.location) {
      return null;
    }

    const baseData = {
      jobType: this.data.jobType,
      pricingMode: this.data.pricingMode,
      location: this.data.location,
    };

    switch (this.data.pricingMode) {
      case 'piece':
        if (!this.data.formData.estimatedQuantity || this.data.formData.estimatedQuantity <= 0) {
          return null;
        }
        return {
          ...baseData,
          pieceInfo: {
            unit: this.data.formData.unit,
            estimatedQuantity: this.data.formData.estimatedQuantity,
          },
        };

      case 'daily':
        if (
          !this.data.formData.estimatedWorkers ||
          this.data.formData.estimatedWorkers <= 0 ||
          !this.data.formData.estimatedDays ||
          this.data.formData.estimatedDays <= 0
        ) {
          return null;
        }
        return {
          ...baseData,
          dailyInfo: {
            estimatedWorkers: this.data.formData.estimatedWorkers,
            estimatedDays: this.data.formData.estimatedDays,
            workingHours: 8,
          },
        };

      case 'monthly':
        if (
          !this.data.formData.estimatedWorkers ||
          this.data.formData.estimatedWorkers <= 0 ||
          !this.data.formData.estimatedMonths ||
          this.data.formData.estimatedMonths <= 0
        ) {
          return null;
        }
        return {
          ...baseData,
          monthlyInfo: {
            estimatedWorkers: this.data.formData.estimatedWorkers,
            estimatedMonths: this.data.formData.estimatedMonths,
          },
        };

      default:
        return null;
    }
  },
});

