/**
 * 逆地理编码云函数（获取地址）
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
  const { latitude, longitude } = event;

  try {
    // 1. 参数验证
    if (!latitude || !longitude) {
      return createInvalidParamsResponse('缺少必要参数：latitude, longitude');
    }

    // 2. 验证坐标范围
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return createInvalidParamsResponse('坐标范围无效');
    }

    // 3. 调用腾讯地图API进行逆地理编码
    // 注意：需要配置腾讯地图API Key
    const mapKey = process.env.TENCENT_MAP_KEY || 'YOUR_TENCENT_MAP_KEY';
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=${mapKey}&get_poi=1`;

    try {
      // 使用云函数HTTP请求
      const result = await cloud.callFunction({
        name: 'httpRequest',
        data: {
          url,
          method: 'GET',
        },
      });

      if (result.result?.status === 0 && result.result?.result) {
        const addressInfo = result.result.result;
        return createSuccessResponse({
          address: addressInfo.address || `${latitude}, ${longitude}`,
          formatted_address: addressInfo.formatted_addresses?.recommend || addressInfo.address,
          province: addressInfo.ad_info?.province || '',
          city: addressInfo.ad_info?.city || '',
          district: addressInfo.ad_info?.district || '',
        });
      } else {
        // 如果API调用失败，返回坐标作为地址
        return createSuccessResponse({
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        });
      }
    } catch (apiError: any) {
      console.error('调用地图API失败:', apiError);
      // 如果API调用失败，返回坐标作为地址
      return createSuccessResponse({
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });
    }
  } catch (error: any) {
    console.error('逆地理编码失败:', error);
    return createErrorResponse(ErrorCode.UNKNOWN_ERROR, undefined, error.message);
  }
};

