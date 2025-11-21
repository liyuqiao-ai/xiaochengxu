/**
 * JWT Token 生成和验证工具
 */

import { cloud } from 'wx-server-sdk';

/**
 * JWT Token 载荷
 */
export interface JWTPayload {
  userId: string;
  openid: string;
  role: string;
  iat: number; // 签发时间
  exp: number; // 过期时间
}

/**
 * JWT配置
 */
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'agriculture-worker-platform-secret-key-2024',
  expiresIn: 7 * 24 * 60 * 60 * 1000, // 7天（毫秒）
};

/**
 * Base64 URL编码
 */
function base64UrlEncode(str: string): string {
  return str
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL解码
 */
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return str;
}

/**
 * 简单的HMAC签名（简化版，生产环境应使用crypto）
 */
function sign(data: string, secret: string): string {
  // 在实际生产环境中，应该使用真正的HMAC-SHA256
  // 这里使用简化版本，仅用于演示
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(data).digest('base64');
}

/**
 * 验证签名
 */
function verify(data: string, signature: string, secret: string): boolean {
  const expectedSignature = sign(data, secret);
  return expectedSignature === signature;
}

/**
 * 生成JWT Token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const now = Date.now();
  const jwtPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_CONFIG.expiresIn,
  };

  // Header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // 编码
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));

  // 签名
  const signature = sign(`${encodedHeader}.${encodedPayload}`, JWT_CONFIG.secret);
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * 验证JWT Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // 验证签名
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = base64UrlDecode(encodedSignature);
    if (!verify(data, signature, JWT_CONFIG.secret)) {
      return null;
    }

    // 解析载荷
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload;

    // 检查过期时间
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 从请求中提取Token
 */
export function extractToken(event: any): string | null {
  // 从header中获取
  if (event.header?.authorization) {
    const authHeader = event.header.authorization;
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }

  // 从参数中获取
  if (event.token) {
    return event.token;
  }

  return null;
}

