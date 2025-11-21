/**
 * 微信小程序类型定义
 */

declare namespace wx {
  interface CloudInitOptions {
    env: string;
    traceUser?: boolean;
  }

  interface CloudCallFunctionOptions {
    name: string;
    data?: any;
  }

  interface CloudCallFunctionResult {
    result: any;
  }

  interface Cloud {
    init(options: CloudInitOptions): void;
    callFunction(options: CloudCallFunctionOptions): Promise<CloudCallFunctionResult>;
    uploadFile(options: {
      cloudPath: string;
      filePath: string;
    }): Promise<{
      fileID: string;
    }>;
    getWXContext(): {
      OPENID: string;
      APPID: string;
      UNIONID?: string;
    };
  }

  const cloud: Cloud;

  function getStorageSync(key: string): any;
  function setStorageSync(key: string, data: any): void;
  function getStorageInfoSync(): {
    keys: string[];
    currentSize: number;
    limitSize: number;
  };
  function navigateTo(options: { url: string; success?: () => void; fail?: () => void }): void;
  function navigateBack(options?: { delta?: number }): void;
  function reLaunch(options: { url: string }): void;
  function redirectTo(options: { url: string }): void;
  function showToast(options: { title: string; icon?: 'success' | 'error' | 'loading' | 'none'; duration?: number; mask?: boolean }): void;
  function showModal(options: {
    title: string;
    content: string;
    showCancel?: boolean;
    cancelText?: string;
    confirmText?: string;
    editable?: boolean;
    placeholderText?: string;
    success?: (res: { confirm: boolean; cancel: boolean; content?: string }) => void;
    fail?: () => void;
  }): void;
  function showLoading(options: { title: string; mask?: boolean }): void;
  function hideLoading(): void;
  function showActionSheet(options: {
    itemList: string[];
    success?: (res: { tapIndex: number }) => void;
    fail?: () => void;
  }): void;
  function getLocation(options: {
    type: 'wgs84' | 'gcj02';
    altitude?: boolean;
    success?: (res: { latitude: number; longitude: number; speed: number; accuracy: number }) => void;
    fail?: () => void;
  }): Promise<{ latitude: number; longitude: number; speed: number; accuracy: number }>;
  function getUserProfile(options: {
    desc: string;
    success?: (res: { userInfo: any }) => void;
    fail?: () => void;
  }): Promise<{ userInfo: any }>;
  function login(options?: {
    success?: (res: { code: string }) => void;
    fail?: () => void;
  }): Promise<{ code: string }>;
  function stopPullDownRefresh(): void;
  function openLocation(options: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    scale?: number;
  }): void;
  function chooseImage(options: {
    count?: number;
    sizeType?: ('original' | 'compressed')[];
    sourceType?: ('album' | 'camera')[];
    success?: (res: { tempFilePaths: string[] }) => void;
    fail?: () => void;
  }): void;
  function previewImage(options: {
    urls: string[];
    current?: string;
  }): void;
  function setClipboardData(options: {
    data: string;
    success?: () => void;
    fail?: () => void;
  }): void;
  function makePhoneCall(options: {
    phoneNumber: string;
    success?: () => void;
    fail?: () => void;
  }): void;
  function showShareMenu(options?: {
    withShareTicket?: boolean;
  }): void;
  function canIUse(api: string): boolean;
}

declare function App(options: {
  onLaunch?: () => void;
  onShow?: () => void;
  onHide?: () => void;
  globalData?: any;
  [key: string]: any;
}): void;

declare function Page(options: {
  data?: any;
  onLoad?: (options: any) => void;
  onShow?: () => void;
  onHide?: () => void;
  onPullDownRefresh?: () => void;
  onReachBottom?: () => void;
  [key: string]: any;
}): void;

declare function getApp(): {
  globalData: any;
  [key: string]: any;
};

