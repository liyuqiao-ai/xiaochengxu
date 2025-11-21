/**
 * 统一错误码和错误消息
 */

/**
 * 错误码枚举
 */
export enum ErrorCode {
  // 通用错误 1000-1999
  SUCCESS = 0,
  UNKNOWN_ERROR = 1000,
  INVALID_PARAMS = 1001,
  DATABASE_ERROR = 1002,
  NETWORK_ERROR = 1003,

  // 用户相关错误 2000-2999
  USER_NOT_FOUND = 2000,
  USER_NOT_AUTHORIZED = 2001,
  USER_ROLE_MISMATCH = 2002,
  USER_NOT_VERIFIED = 2003,
  USER_ALREADY_EXISTS = 2004,
  LOGIN_FAILED = 2005,

  // 订单相关错误 3000-3999
  ORDER_NOT_FOUND = 3000,
  ORDER_STATUS_INVALID = 3001,
  ORDER_VALIDATION_FAILED = 3002,
  ORDER_ALREADY_QUOTED = 3003,
  ORDER_ALREADY_CONFIRMED = 3004,
  ORDER_CANNOT_CANCEL = 3005,
  ORDER_ALREADY_COMPLETED = 3006,

  // 支付相关错误 4000-4999
  PAYMENT_CALCULATION_FAILED = 4000,
  PAYMENT_FAILED = 4001,
  PAYMENT_AMOUNT_INVALID = 4002,
  SETTLEMENT_FAILED = 4003,

  // 通知相关错误 5000-5999
  NOTIFICATION_SEND_FAILED = 5000,
}

/**
 * 错误消息映射
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '操作成功',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.INVALID_PARAMS]: '参数无效',
  [ErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [ErrorCode.NETWORK_ERROR]: '网络错误',

  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_NOT_AUTHORIZED]: '用户未授权',
  [ErrorCode.USER_ROLE_MISMATCH]: '用户角色不匹配',
  [ErrorCode.USER_NOT_VERIFIED]: '用户未认证',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.LOGIN_FAILED]: '登录失败',

  [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCode.ORDER_STATUS_INVALID]: '订单状态无效',
  [ErrorCode.ORDER_VALIDATION_FAILED]: '订单数据验证失败',
  [ErrorCode.ORDER_ALREADY_QUOTED]: '订单已报价',
  [ErrorCode.ORDER_ALREADY_CONFIRMED]: '订单已确认',
  [ErrorCode.ORDER_CANNOT_CANCEL]: '订单无法取消',
  [ErrorCode.ORDER_ALREADY_COMPLETED]: '订单已完成',

  [ErrorCode.PAYMENT_CALCULATION_FAILED]: '支付金额计算失败',
  [ErrorCode.PAYMENT_FAILED]: '支付失败',
  [ErrorCode.PAYMENT_AMOUNT_INVALID]: '支付金额无效',
  [ErrorCode.SETTLEMENT_FAILED]: '结算失败',

  [ErrorCode.NOTIFICATION_SEND_FAILED]: '通知发送失败',
};

/**
 * 统一响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  code: ErrorCode;
  message: string;
  data?: T;
  error?: string;
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data?: T): ApiResponse<T> {
  return {
    success: true,
    code: ErrorCode.SUCCESS,
    message: ErrorMessages[ErrorCode.SUCCESS],
    data,
  };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  code: ErrorCode,
  customMessage?: string,
  error?: string
): ApiResponse {
  return {
    success: false,
    code,
    message: customMessage || ErrorMessages[code],
    error: error || customMessage || ErrorMessages[code],
  };
}

/**
 * 创建参数错误响应
 */
export function createInvalidParamsResponse(error?: string): ApiResponse {
  return createErrorResponse(ErrorCode.INVALID_PARAMS, undefined, error);
}

/**
 * 创建数据库错误响应
 */
export function createDatabaseErrorResponse(error?: string): ApiResponse {
  return createErrorResponse(ErrorCode.DATABASE_ERROR, undefined, error);
}

