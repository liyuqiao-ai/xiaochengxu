/**
 * 工头端团队管理页面
 */

Page({
  data: {
    teamMembers: [] as any[],
    pendingRequests: [] as any[],
    loading: false,
    tabs: ['团队成员', '入队申请'],
    activeTab: 0,
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 切换标签
   */
  onTabChange(e: any) {
    const index = e.detail.index;
    this.setData({ activeTab: index });
    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      this.setData({ loading: true });

      if (this.data.activeTab === 0) {
        // 加载团队成员
        const result = await wx.cloud.callFunction({
          name: 'getTeamMembers',
          data: {},
        });

        if (result.result.success) {
          this.setData({
            teamMembers: result.result.data?.members || [],
            loading: false,
          });
        }
      } else {
        // 加载入队申请
        const result = await wx.cloud.callFunction({
          name: 'getPendingRequests',
          data: {},
        });

        if (result.result.success) {
          this.setData({
            pendingRequests: result.result.data?.requests || [],
            loading: false,
          });
        }
      }
    } catch (error) {
      this.setData({ loading: false });
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
    }
  },

  /**
   * 审核入队申请
   */
  async reviewRequest(e: any) {
    const { requestId, action } = e.currentTarget.dataset;
    const userInfo = wx.getStorageSync('userInfo');

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    // 将action转换为status
    const status = action === 'approve' ? 'approved' : 'rejected';

    try {
      wx.showLoading({ title: '处理中...' });

      const result = await wx.cloud.callFunction({
        name: 'reviewTeamRequest',
        data: {
          requestId,
          status, // 'approved' or 'rejected'
          contractorId: userInfo._id,
        },
      });

      wx.hideLoading();

      if (result.result.success) {
        wx.showToast({
          title: status === 'approved' ? '已同意' : '已拒绝',
          icon: 'success',
        });
        // 刷新数据
        this.loadData();
      } else {
        wx.showToast({
          title: result.result.error || '处理失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('审核失败:', error);
      wx.showToast({
        title: '处理失败',
        icon: 'none',
      });
    }
  },

  /**
   * 移除团队成员
   */
  async removeMember(e: any) {
    const workerId = e.currentTarget.dataset.workerId;

    wx.showModal({
      title: '确认移除',
      content: '确定要移除此成员吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });

            const result = await wx.cloud.callFunction({
              name: 'removeTeamMember',
              data: { workerId },
            });

            wx.hideLoading();

            if (result.result.success) {
              wx.showToast({
                title: '移除成功',
                icon: 'success',
              });
              this.loadData();
            } else {
              wx.showToast({
                title: result.result.error || '移除失败',
                icon: 'none',
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('移除成员失败:', error);
            wx.showToast({
              title: '移除失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },

  /**
   * 查看成员详情
   */
  viewMemberDetail(e: any) {
    const workerId = e.currentTarget.dataset.workerId;
    wx.navigateTo({
      url: `/pages/contractor/member-detail/member-detail?workerId=${workerId}`,
    });
  },

  /**
   * 查看申请列表
   */
  viewApplications() {
    // 切换到申请标签
    this.setData({ activeTab: 1 });
    this.loadData();
  },

  /**
   * 添加工人
   */
  addMember() {
    wx.showActionSheet({
      itemList: ['扫码添加', '搜索添加'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 扫码添加
          wx.scanCode({
            success: async (scanRes) => {
              const content = scanRes.result;
              if (!content.startsWith('worker:')) {
                wx.showToast({
                  title: '无效的二维码',
                  icon: 'none',
                });
                return;
              }

              const workerId = content.replace('worker:', '');
              try {
                wx.showLoading({ title: '添加中...' });
                const result = await wx.cloud.callFunction({
                  name: 'addTeamMember',
                  data: { workerId },
                });
                wx.hideLoading();

                if (result.result.success) {
                  wx.showToast({ title: '添加成功', icon: 'success' });
                  this.loadData();
                } else {
                  wx.showToast({
                    title: result.result.error || '添加失败',
                    icon: 'none',
                  });
                }
              } catch (error) {
                wx.hideLoading();
                wx.showToast({ title: '添加失败', icon: 'none' });
              }
            },
          });
        } else {
          // 搜索添加
          wx.showToast({
            title: '功能开发中',
            icon: 'none',
          });
        }
      },
    });
  },

  /**
   * 查看团队统计
   */
  viewTeamStats() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },
});

