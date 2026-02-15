import { getEnvConfig } from './env.config';

export interface ProcessManagerConfig {
  /**
   * 是否啟用效能優化
   */
  enableOptimizations: boolean;
  
  /**
   * 進程啟動延遲（毫秒）
   * 某些系統可能需要更長的啟動時間
   */
  startupDelay: number;
  
  /**
   * 訊息處理超時（毫秒）
   * 如果 Claude 在此時間內沒有回應，視為超時
   */
  messageTimeout: number;
}

// 預設配置
export const defaultProcessManagerConfig: ProcessManagerConfig = {
  enableOptimizations: getEnvConfig().process.enableOptimizations,
  startupDelay: getEnvConfig().process.startupDelay,
  messageTimeout: getEnvConfig().process.messageTimeout
};

// 根據環境選擇最佳配置
export function getOptimalConfig(): ProcessManagerConfig {
  // Windows 用戶可能需要更長的啟動時間
  if (process.platform === 'win32') {
    return {
      ...defaultProcessManagerConfig,
      startupDelay: 1000,
      messageTimeout: 180000 // Windows 給予 3 分鐘
    };
  }
  
  return defaultProcessManagerConfig;
}