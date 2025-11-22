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
    teamStats: {
      totalMembers: 0,
      pendingRequests: 0,
    },
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
    const index = parseInt(e.currentTarget.dataset.index || e.detail.index || 0);
    this.setData({ activeTab: index });
    this.loadData();
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      this.setData({ loading: true });

      // 并行加载团队成员和待审核申请
      const [membersResult, requestsResult] = await Promise.all([
        wx.cloud.callFunction({
          name: 'getTeamMembers',
          data: {},
        }).catch(() => ({ result: { success: false, data: { members: [] } } })),
        wx.cloud.callFunction({
          name: 'getPendingRequests',
          data: {},
        }).catch(() => ({ result: { success: false, data: { requests: [] } } })),
      ]);

      const members = membersResult.result.data?.members || [];
      const requests = requestsResult.result.data?.requests || [];

      this.setData({
        teamMembers: members,
        pendingRequests: requests,
        'teamStats.totalMembers': members.length,
        'teamStats.pendingRequests': requests.length,
        loading: false,
      });
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

  /**
   * 扫码添加工人
   */
  scanToAddMember() {
    this.scanAddMember();
  },

  /**
   * 扫码添加工人
   */
  scanAddMember() {
    wx.scanCode({
      success: async (res) => {
        const content = res.result;
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
  },

  /**
   * 同意申请
   */
  async approveRequest(e: any) {
    const requestId = e.currentTarget.dataset.requestId;
    await this.reviewRequest({
      currentTarget: {
        dataset: {
          requestId,
          action: 'approve',
        },
      },
    });
  },

  /**
   * 拒绝申请
   */
  async rejectRequest(e: any) {
    const requestId = e.currentTarget.dataset.requestId;
    await this.reviewRequest({
      currentTarget: {
        dataset: {
          requestId,
          action: 'reject',
        },
      },
    });
  },

  /**
   * 分配任务
   */
  assignTask(e: any) {
    const memberId = e.currentTarget.dataset.memberId;
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  /**
   * 生成邀请链接
   */
  generateInviteLink() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  /**
   * 联系成员
   */
  chatWithMember(e: any) {
    const memberId = e.currentTarget.dataset.memberId;
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  /**
   * 查看全部申请
   */
  viewAllRequests() {
    this.setData({ activeTab: 1 });
  },
});

