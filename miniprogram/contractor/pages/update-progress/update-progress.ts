/**
 * 更新订单进度页面
 */

Page({
  data: {
    orderId: '',
    order: null as any,
    progress: 0,
    description: '',
    images: [] as string[],
    loading: false,
  },

  onLoad(options: any) {
    const { orderId } = options;
    if (orderId) {
      this.setData({ orderId });
      this.loadOrderDetail();
    }
  },

  /**
   * 加载订单详情
   */
  async loadOrderDetail() {
    try {
      wx.showLoading({ title: '加载中...' });

      const result = await wx.cloud.callFunction({
        name: 'getOrderDetail',
        data: { orderId: this.data.orderId },
      });

      if (!result.result.success) {
        throw new Error(result.result.error || '获取订单详情失败');
      }

      const order = result.result.data?.order;
      if (!order) {
        throw new Error('订单不存在');
      }

      this.setData({
        order,
        progress: order.progress || 0,
        description: order.progressDescription || '',
        images: order.progressImages || [],
      });

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('加载订单详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 输入进度
   */
  onProgressInput(e: any) {
    const value = parseInt(e.detail.value) || 0;
    this.setData({
      progress: Math.max(0, Math.min(100, value)),
    });
  },

  /**
   * 输入描述
   */
  onDescriptionInput(e: any) {
    this.setData({
      description: e.detail.value,
    });
  },

  /**
   * 选择图片
   */
  chooseImage() {
    wx.chooseImage({
      count: 9 - this.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 上传图片到云存储
        this.uploadImages(res.tempFilePaths);
      },
    });
  },

  /**
   * 上传图片
   */
  async uploadImages(filePaths: string[]) {
    try {
      wx.showLoading({ title: '上传中...' });

      const uploadPromises = filePaths.map((filePath) => {
        const cloudPath = `order-progress/${this.data.orderId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        return wx.cloud.uploadFile({
          cloudPath,
          filePath,
        });
      });

      const results = await Promise.all(uploadPromises);
      const imageUrls = results.map((res) => res.fileID);

      this.setData({
        images: [...this.data.images, ...imageUrls],
      });

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('上传图片失败:', error);
      wx.showToast({
        title: '上传失败',
        icon: 'none',
      });
    }
  },

  /**
   * 删除图片
   */
  deleteImage(e: any) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ images });
  },

  /**
   * 提交更新
   */
  async submitUpdate() {
    const { orderId, progress, description, images } = this.data;

    if (progress < 0 || progress > 100) {
      wx.showToast({
        title: '进度必须在0-100之间',
        icon: 'none',
      });
      return;
    }

    try {
      this.setData({ loading: true });
      wx.showLoading({ title: '提交中...' });

      const result = await wx.cloud.callFunction({
        name: 'updateProgress',
        data: {
          orderId,
          progress,
          description,
          images,
        },
      });

      wx.hideLoading();
      this.setData({ loading: false });

      if (result.result.success) {
        wx.showToast({
          title: '更新成功',
          icon: 'success',
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result.error || '更新失败',
          icon: 'none',
        });
      }
    } catch (error: any) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('更新进度失败:', error);
      wx.showToast({
        title: '更新失败',
        icon: 'none',
      });
    }
  },
});

