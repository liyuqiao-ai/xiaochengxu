/**
 * API调用工具
 */

/**
 * 调用云函数（自动添加token）
 */
export async function callCloudFunction(name: string, data: any = {}) {
  try {
    // 获取token
    const token = wx.getStorageSync('token');
    if (token) {
      data.token = token;
    }

    const result = await wx.cloud.callFunction({
      name,
      data,
    });

    return result.result;
  } catch (error: any) {
    console.error(`调用云函数 ${name} 失败:`, error);
    throw error;
  }
}

/**
 * 格式化金额（分转元）
 */
export function formatAmount(fen: number): string {
  if (!fen) return '0.00';
  return (fen / 100).toFixed(2);
}

/**
 * 格式化日期
 */
export function formatDate(date: Date | string | null, format: 'date' | 'datetime' = 'datetime'): string {
  if (!date) return '-';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (format === 'date') {
    return `${year}-${month}-${day}`;
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 获取状态文本
 */
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '待报价',
    quoted: '已报价',
    confirmed: '已确认',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  };
  return statusMap[status] || status;
}

/**
 * 获取工种文本
 */
export function getJobTypeText(jobType: string): string {
  const jobTypeMap: Record<string, string> = {
    harvest: '收割',
    plant: '种植',
    fertilize: '施肥',
    pesticide: '打药',
    weeding: '除草',
    management: '管理',
  };
  return jobTypeMap[jobType] || jobType;
}

/**
 * 获取计价模式文本
 */
export function getPricingModeText(pricingMode: string): string {
  const pricingModeMap: Record<string, string> = {
    piece: '记件',
    daily: '按天',
    monthly: '包月',
  };
  return pricingModeMap[pricingMode] || pricingMode;
}

