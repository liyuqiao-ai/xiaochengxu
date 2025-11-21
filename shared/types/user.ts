/**
 * 用户相关类型定义
 */

/**
 * 用户角色
 */
export type UserRole = 'farmer' | 'worker' | 'contractor' | 'introducer';

/**
 * 用户状态
 */
export type UserStatus = 'pending' | 'active' | 'banned';

/**
 * 基础用户接口
 */
export interface BaseUser {
  _id: string;
  openid: string;
  phone: string;
  avatarUrl: string;
  nickName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 地理位置信息
 */
export interface Location {
  lat: number;
  lng: number;
  address: string;
}

/**
 * 农户接口
 */
export interface Farmer extends BaseUser {
  role: 'farmer';
  farmLocation: Location;
  farmSize: number; // 农田面积（亩）
}

/**
 * 工人接口
 */
export interface Worker extends BaseUser {
  role: 'worker';
  realName: string;
  idCard: string;
  skills: string[]; // 技能列表
  experience: number; // 工作经验（年）
  contractorId?: string; // 绑定的工头ID
  creditScore: number; // 信用分
}

/**
 * 认证状态
 */
export type CertificationStatus = 'pending' | 'approved' | 'rejected';

/**
 * 工头接口
 */
export interface Contractor extends BaseUser {
  role: 'contractor';
  companyName?: string; // 公司名称（可选）
  teamSize: number; // 团队规模
  deposit: number; // 保证金（分）
  creditScore: number; // 信用分
  certification: {
    status: CertificationStatus;
    documents: string[]; // 认证文件URL列表
  };
}

/**
 * 介绍方接口
 */
export interface Introducer extends BaseUser {
  role: 'introducer';
  promotionCode: string; // 推广码
  totalCommission: number; // 累计佣金（分）
}

/**
 * 用户联合类型
 */
export type User = Farmer | Worker | Contractor | Introducer;

