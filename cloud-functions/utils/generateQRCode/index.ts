/**
 * 生成小程序码云函数
 */

import { cloud } from 'wx-server-sdk';
import {
  createSuccessResponse,
  createErrorResponse,
  createInvalidParamsResponse,
  ErrorCode,
} from '../../../shared/utils/errors';

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

/**
 * 主函数
 */
export const main = async (event: any) => {
  const { scene, page, width } = event;

  try {
    // 1. 参数验证
    if (!scene) {
      return createInvalidParamsResponse('缺少必要参数：scene');
    }

    // 2. 生成小程序码
    // 使用微信小程序码API
    try {
      const result = await cloud.openapi.wxacode.getUnlimited({
        scene: scene.substring(0, 32), // 场景值最长32个字符
        page: page || 'pages/index/index',
        width: width || 280,
        autoColor: true,
        lineColor: { r: 0, g: 0, b: 0 },
        isHyaline: false,
      });

      // 上传到云存储
      const cloudPath = `qrcodes/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
      const uploadResult = await cloud.uploadFile({
        cloudPath,
        fileContent: result.buffer,
      });

      return createSuccessResponse({
        fileID: uploadResult.fileID,
        url: uploadResult.fileID,
      });
    } catch (error: any) {
      console.error('生成小程序码失败:', error);
      return createErrorResponse(ErrorCode.UNKNOWN_ERROR, '生成小程序码失败', error.message);
    }
  } catch (error: any) {
    console.error('生成二维码失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

