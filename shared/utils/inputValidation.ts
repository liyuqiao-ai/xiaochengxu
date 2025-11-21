/**
 * 输入验证工具
 */

/**
 * 验证字符串输入（防止XSS）
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // 移除危险字符
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  
  // 限制长度
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * 验证ID格式
 */
export function validateId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  // MongoDB ObjectId 格式验证
  return /^[a-f\d]{24}$/i.test(id);
}

/**
 * 验证金额（分）
 */
export function validateAmount(amount: number, min = 0, max = 5000000): boolean {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }
  return amount >= min && amount <= max && Number.isInteger(amount);
}

/**
 * 验证经纬度
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * 验证日期
 */
export function validateDate(date: Date | string): boolean {
  if (!date) {
    return false;
  }
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * 验证数组
 */
export function validateArray<T>(arr: T[], minLength = 0, maxLength = 1000): boolean {
  if (!Array.isArray(arr)) {
    return false;
  }
  return arr.length >= minLength && arr.length <= maxLength;
}

