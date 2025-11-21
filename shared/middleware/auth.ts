/**
 * 认证中间件
 */

import { JWTPayload, verifyToken, extractToken } from '../utils/jwt';
import { createErrorResponse, ErrorCode } from '../utils/errors';
import { ApiResponse } from '../utils/errors';
import { createDatabase } from '../utils/db';

/**
 * 认证上下文
 */
export interface AuthContext {
  userId: string;
  openid: string;
  role: string;
  payload: JWTPayload;
}

/**
 * 认证中间件
 */
export function authMiddleware(event: any): {
  success: boolean;
  context?: AuthContext;
  response?: ApiResponse;
} {
  // 提取token
  const token = extractToken(event);

  if (!token) {
    return {
      success: false,
      response: createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, '缺少认证Token'),
    };
  }

  // 验证token
  const payload = verifyToken(token);
  if (!payload) {
    return {
      success: false,
      response: createErrorResponse(ErrorCode.USER_NOT_AUTHORIZED, 'Token无效或已过期'),
    };
  }

  // 返回认证上下文
  return {
    success: true,
    context: {
      userId: payload.userId,
      openid: payload.openid,
      role: payload.role,
      payload,
    },
  };
}

/**
 * 权限检查中间件
 */
export function requireRole(allowedRoles: string[]) {
  return (event: any, context: AuthContext): {
    success: boolean;
    response?: ApiResponse;
  } => {
    if (!allowedRoles.includes(context.role)) {
      return {
        success: false,
        response: createErrorResponse(
          ErrorCode.USER_ROLE_MISMATCH,
          `需要角色: ${allowedRoles.join(', ')}`
        ),
      };
    }

    return { success: true };
  };
}

/**
 * 验证订单访问权限
 * @param userId 用户ID
 * @param orderId 订单ID
 * @returns 是否有权限访问此订单
 */
export async function validateOrderAccess(userId: string, orderId: string): Promise<{
  success: boolean;
  error?: string;
  order?: any;
}> {
  try {
    const db = createDatabase();

    // 1. 获取订单
    const order = await db.getDoc('orders', orderId);
    if (!order) {
      return {
        success: false,
        error: '订单不存在',
      };
    }

    // 2. 检查用户是否是订单相关的用户
    const isFarmer = order.farmerId === userId;
    const isContractor = order.contractorId === userId;
    const isIntroducer = order.introducerId === userId;

    if (!isFarmer && !isContractor && !isIntroducer) {
      return {
        success: false,
        error: '无权访问此订单',
      };
    }

    return {
      success: true,
      order,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '验证订单权限失败',
    };
  }
}

/**
 * 组合中间件
 */
export function combineMiddleware(
  ...middlewares: Array<(event: any, context?: AuthContext) => any>
) {
  return async (event: any) => {
    let context: AuthContext | undefined;

    for (const middleware of middlewares) {
      const result = middleware(event, context);
      
      if (!result.success) {
        return result.response;
      }

      if (result.context) {
        context = result.context;
      }
    }

    return { context };
  };
}
