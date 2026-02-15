import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * 從 Axios 錯誤中提取錯誤訊息
 * @param error - Axios 錯誤物件
 * @param defaultMessage - 預設錯誤訊息
 * @returns 錯誤訊息字串
 */
export const getErrorMessage = (error: unknown, defaultMessage = '操作失敗，請稍後再試'): string => {
  if (error instanceof AxiosError) {
    // 處理 API 回傳的錯誤
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    // 處理網路錯誤
    if (error.code === 'ECONNABORTED') {
      return '請求超時，請Check網路連線';
    }
    
    if (error.code === 'ERR_NETWORK') {
      return '網路連線失敗，請Check網路設定';
    }
    
    // 處理 HTTP 狀態碼
    if (error.response?.status) {
      switch (error.response.status) {
        case 400:
          return '請求參數錯誤';
        case 401:
          return '認證失敗，請重新登入';
        case 403:
          return '您沒有權限執行此操作';
        case 404:
          return '請求的資源不存在';
        case 500:
          return '伺服器錯誤，請稍後再試';
        case 502:
        case 503:
          return '伺服器暫時無法提供服務';
        default:
          return defaultMessage;
      }
    }
  }
  
  // 處理一般錯誤
  if (error instanceof Error) {
    return error.message;
  }
  
  return defaultMessage;
};