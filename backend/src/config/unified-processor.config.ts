/**
 * 統一處理器配置
 * 
 * 用於解決 Claude Code stream JSON 重複儲存問題
 */

import { getEnvConfig } from './env.config';

export interface UnifiedProcessorConfig {
  // 是否啟用統一處理器
  enabled: boolean;
  
  // 訊息去重配置
  deduplication: {
    // 是否使用 message ID 去重
    useMessageId: boolean;
    // 保留的已處理訊息 ID 數量
    maxProcessedIds: number;
    // 內容比對去重的時間窗口（毫秒）
    contentDedupeWindow: number;
  };
  
  // 訊息過濾配置
  filtering: {
    // 忽略的訊息類型
    ignoreTypes: string[];
    // 是否忽略空白訊息
    ignoreEmpty: boolean;
  };
  
  // 緩衝配置
  buffering: {
    // 最大緩衝訊息數量
    maxBufferSize: number;
    // 緩衝超時時間（毫秒）
    bufferTimeout: number;
  };
  
  // 效能配置
  performance: {
    // 是否並行處理工具使用
    parallelToolProcessing: boolean;
    // 是否啟用批次儲存
    batchSave: boolean;
    // 批次大小
    batchSize: number;
  };
  
  // 相容性配置
  compatibility: {
    // 是否啟用舊版串流處理器後備
    enableStreamFallback: boolean;
    // 是否啟用批次處理後備
    enableBatchFallback: boolean;
  };
  
  // 除錯配置
  debug: {
    // 是否記錄詳細日誌
    verbose: boolean;
    // 是否記錄訊息 ID
    logMessageIds: boolean;
    // 是否記錄重複檢測
    logDuplicates: boolean;
  };
}

/**
 * 預設配置
 */
export const defaultUnifiedProcessorConfig: UnifiedProcessorConfig = {
  enabled: true,
  
  deduplication: {
    useMessageId: true,
    maxProcessedIds: 1000,
    contentDedupeWindow: 2000 // 2秒
  },
  
  filtering: {
    ignoreTypes: ['result', 'echo'], // 學習 vibe-kanban
    ignoreEmpty: true
  },
  
  buffering: {
    maxBufferSize: 100,
    bufferTimeout: 5000 // 5秒
  },
  
  performance: {
    parallelToolProcessing: true,
    batchSave: false, // 先保持單一儲存，確保穩定性
    batchSize: 10
  },
  
  compatibility: {
    enableStreamFallback: true,
    enableBatchFallback: true
  },
  
  debug: {
    verbose: getEnvConfig().nodeEnv === 'development',
    logMessageIds: getEnvConfig().nodeEnv === 'development',
    logDuplicates: true
  }
};

/**
 * 生產環境配置
 */
export const productionUnifiedProcessorConfig: UnifiedProcessorConfig = {
  ...defaultUnifiedProcessorConfig,
  
  debug: {
    verbose: false,
    logMessageIds: false,
    logDuplicates: false
  },
  
  performance: {
    ...defaultUnifiedProcessorConfig.performance,
    batchSave: true, // 生產環境啟用批次儲存
  }
};

/**
 * 開發環境配置
 */
export const developmentUnifiedProcessorConfig: UnifiedProcessorConfig = {
  ...defaultUnifiedProcessorConfig,
  
  debug: {
    verbose: true,
    logMessageIds: true,
    logDuplicates: true
  },
  
  deduplication: {
    ...defaultUnifiedProcessorConfig.deduplication,
    maxProcessedIds: 100 // 開發時保持較小的記憶體使用
  }
};

/**
 * 獲取當前環境配置
 */
export function getUnifiedProcessorConfig(): UnifiedProcessorConfig {
  const env = getEnvConfig().nodeEnv;
  
  switch (env) {
    case 'production':
      return productionUnifiedProcessorConfig;
    case 'development':
    case 'test':
    default:
      return developmentUnifiedProcessorConfig;
  }
}

/**
 * 配置驗證
 */
export function validateUnifiedProcessorConfig(config: UnifiedProcessorConfig): boolean {
  // 基本驗證
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  // 驗證數值範圍
  if (config.deduplication.maxProcessedIds < 10 || config.deduplication.maxProcessedIds > 10000) {
    console.warn('UnifiedProcessor: maxProcessedIds should be between 10 and 10000, using default');
    config.deduplication.maxProcessedIds = 1000;
  }
  
  if (config.deduplication.contentDedupeWindow < 100 || config.deduplication.contentDedupeWindow > 60000) {
    console.warn('UnifiedProcessor: contentDedupeWindow should be between 100ms and 60s, using default');
    config.deduplication.contentDedupeWindow = 2000;
  }
  
  if (config.buffering.maxBufferSize < 1 || config.buffering.maxBufferSize > 1000) {
    console.warn('UnifiedProcessor: maxBufferSize should be between 1 and 1000, using default');
    config.buffering.maxBufferSize = 100;
  }
  
  return true;
}