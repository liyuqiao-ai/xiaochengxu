/**
 * 订单相关类型定义
 */

import { Location } from './user';

/**
 * 工种类型
 */
export type JobType = 'harvest' | 'plant' | 'fertilize' | 'pesticide' | 'weeding' | 'management';

/**
 * 计价模式
 */
export type PricingMode = 'piece' | 'daily' | 'monthly';

/**
 * 订单状态
 */
export type OrderStatus = 'pending' | 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

/**
 * 记件单位
 */
export type PieceUnit = 'acre' | 'jin' | 'cart'; // 亩/斤/车

/**
 * 记件信息
 */
export interface PieceInfo {
  unit: PieceUnit;
  estimatedQuantity: number; // 预估数量
  unitPrice: number; // 单价（分）
}

/**
 * 按天信息
 */
export interface DailyInfo {
  estimatedWorkers: number; // 预估用工人数
  estimatedDays: number; // 预估天数
  dailySalary: number; // 日薪（分）
  workingHours: number; // 标准工时，默认8
}

/**
 * 包月信息
 */
export interface MonthlyInfo {
  estimatedWorkers: number; // 预估用工人数
  estimatedMonths: number; // 预估月数
  monthlySalary: number; // 月薪（分）
}

/**
 * 实际工作量
 */
export interface ActualWorkload {
  quantity?: number; // 记件实际数量
  days?: number; // 按天实际天数
  months?: number; // 包月实际月数
  workers?: number; // 实际用工人数
  overtimeHours: number; // 加班小时数
}

/**
 * 财务信息
 */
export interface Financials {
  baseAmount: number; // 基础劳务费（分）
  platformFee: number; // 平台服务费（分）
  introducerCommission: number; // 介绍方佣金（分）
  totalAmount: number; // 农户支付总额（分）
  contractorIncome: number; // 工头实收（分）
}

/**
 * 订单时间轴
 */
export interface OrderTimeline {
  createdAt: Date; // 创建时间
  quotedAt?: Date; // 报价时间
  confirmedAt?: Date; // 确认时间
  startedAt?: Date; // 开始时间
  completedAt?: Date; // 完成时间
}

/**
 * 支付计算结果
 */
export interface PaymentCalculation {
  baseAmount: number; // 基础劳务费（分）
  platformFee: number; // 平台服务费（分）
  introducerCommission: number; // 介绍方佣金（分）
  totalAmount: number; // 农户支付总额（分）
  contractorIncome: number; // 工头实收（分）
  breakdown: {
    laborCost: number; // 基础劳务费（分）
    overtimeCost: number; // 加班费（分）
    platformFee: number; // 平台服务费（分）
    introducerFee: number; // 介绍方佣金（分）
  };
}

/**
 * 订单接口
 */
export interface Order {
  _id: string;
  
  // 基础信息
  farmerId: string; // 农户ID
  contractorId?: string; // 工头ID
  introducerId?: string; // 介绍方ID
  
  // 需求信息
  jobType: JobType; // 工种
  pricingMode: PricingMode; // 计价模式
  location: Location; // 工作地点
  
  // 计价信息（根据pricingMode选择其一）
  pieceInfo?: PieceInfo; // 记件信息
  dailyInfo?: DailyInfo; // 按天信息
  monthlyInfo?: MonthlyInfo; // 包月信息
  
  // 实际工作量
  actualWorkload: ActualWorkload;
  
  // 财务信息
  financials?: Financials;
  
  // 状态跟踪
  status: OrderStatus;
  timeline: OrderTimeline;
  
  // 确认状态
  confirmedByFarmer?: boolean; // 农户确认
  confirmedByContractor?: boolean; // 工头确认
}

