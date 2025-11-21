/**
 * 平台配置常量
 */

/**
 * 平台费用配置
 */
export const PLATFORM_CONFIG = {
  // 费用配置
  FEES: {
    PLATFORM_FEE_RATE: 0.05, // 平台服务费率 5%
    INTRODUCER_COMMISSION_RATE: 0.02, // 介绍方佣金率 2%
    PAYMENT_FEE_RATE: 0.003, // 支付手续费率 0.3%
  },

  // 计价配置
  PRICING: {
    STANDARD_WORKING_HOURS: 8, // 标准工时（小时/天）
    OVERTIME_RATE_MULTIPLIER: 1.5, // 加班费率倍数
    MONTHLY_STANDARD_HOURS: 208, // 月标准工时（26天 × 8小时）
  },

  // 业务配置
  BUSINESS: {
    MAX_ORDER_AMOUNT: 50000, // 最大订单金额（分）
    AUTO_CONFIRM_HOURS: 24, // 自动确认时长（小时）
    SETTLEMENT_DAYS: 1, // T+1结算
  },
};

/**
 * 工种配置
 */
export const JOB_TYPES = {
  harvest: {
    name: '收割',
    units: ['acre', 'jin'] as const,
    description: '农作物收割作业',
  },
  plant: {
    name: '种植',
    units: ['acre'] as const,
    description: '农作物种植作业',
  },
  fertilize: {
    name: '施肥',
    units: ['acre'] as const,
    description: '农田施肥作业',
  },
  pesticide: {
    name: '打药',
    units: ['acre'] as const,
    description: '农田打药作业',
  },
  weeding: {
    name: '除草',
    units: ['acre', 'daily'] as const,
    description: '农田除草作业',
  },
  management: {
    name: '管理',
    units: ['daily', 'monthly'] as const,
    description: '农田日常管理',
  },
} as const;

/**
 * 计价模式配置
 */
export const PRICING_MODES = {
  piece: {
    name: '记件',
    description: '按工作量计费',
  },
  daily: {
    name: '按天',
    description: '按天数和人数计费',
  },
  monthly: {
    name: '包月',
    description: '按月数和人数计费',
  },
} as const;

