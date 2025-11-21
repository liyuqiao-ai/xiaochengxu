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

  interface CloudUploadFileOptions {
    cloudPath: string;
    filePath: string;
  }

  interface CloudUploadFileResult {
    fileID: string;
  }

  interface Cloud {
    init(options: CloudInitOptions): void;
    callFunction(options: CloudCallFunctionOptions): Promise<CloudCallFunctionResult>;
    uploadFile(options: CloudUploadFileOptions): Promise<CloudUploadFileResult>;
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
  interface GetLocationResult {
    latitude: number;
    longitude: number;
    speed: number;
    accuracy: number;
  }

  interface GetLocationOptions {
    type: 'wgs84' | 'gcj02';
    altitude?: boolean;
    success?: (res: GetLocationResult) => void;
    fail?: (err: any) => void;
  }

  function getLocation(options: GetLocationOptions): void;
  function getLocation(options: Omit<GetLocationOptions, 'success' | 'fail'>): Promise<GetLocationResult>;
  interface GetUserProfileResult {
    userInfo: {
      nickName: string;
      avatarUrl: string;
      gender: number;
      country: string;
      province: string;
      city: string;
      language: string;
    };
  }

  interface GetUserProfileOptions {
    desc: string;
    success?: (res: GetUserProfileResult) => void;
    fail?: (err: any) => void;
  }

  function getUserProfile(options: GetUserProfileOptions): void;
  function getUserProfile(options: Omit<GetUserProfileOptions, 'success' | 'fail'>): Promise<GetUserProfileResult>;

  interface LoginResult {
    code: string;
  }

  interface LoginOptions {
    success?: (res: LoginResult) => void;
    fail?: (err: any) => void;
  }

  function login(options?: LoginOptions): void;
  function login(): Promise<LoginResult>;
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
  function chooseImage(options: {
    count?: number;
    sizeType?: ('original' | 'compressed')[];
    sourceType?: ('album' | 'camera')[];
  }): Promise<{ tempFilePaths: string[] }>;
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
  function requestPayment(options: {
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: 'MD5' | 'HMAC-SHA256';
    paySign: string;
    success?: () => void;
    fail?: (err: any) => void;
    complete?: () => void;
  }): void;
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

