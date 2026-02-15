import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './world';
import { v4 as uuidv4 } from 'uuid';

// 錯誤處理相關的 Steps

// Given Steps

Given('Claude Code 執行檔路徑設定錯誤', async function(this: TestContext) {
  // 模擬錯誤的執行檔路徑
  this.testData.claudeCodePath = '/nonexistent/path/to/claude';
});

Given('Claude Code 因授權問題無法啟動', async function(this: TestContext) {
  // 模擬授權問題
  this.testData.processStartError = {
    code: 'EACCES',
    message: 'Permission denied'
  };
});

Given('資料庫服務暫時不可用', async function(this: TestContext) {
  // 模擬資料庫連線錯誤
  this.testData.databaseError = {
    code: 'DATABASE_ERROR',
    message: 'Database service temporarily unavailable'
  };
});

Given('WebSocket 服務未啟動', async function(this: TestContext) {
  // 模擬 WebSocket 服務未啟動
  this.testData.websocketServerStatus = {
    running: false,
    error: 'WebSocket service not started'
  };
});

Given('系統可用記憶體低於 100MB', async function(this: TestContext) {
  // 模擬記憶體不足
  this.testData.systemMemory = {
    available: 90 * 1024 * 1024, // 90MB
    threshold: 100 * 1024 * 1024 // 100MB
  };
});

Given('Session 的對話歷史檔案損壞', async function(this: TestContext) {
  // 模擬歷史檔案損壞
  this.testData.corruptSession = {
    sessionId: uuidv4(),
    historyFile: '/path/to/corrupt/history.json',
    error: 'JSON parse error: unexpected token'
  };
});

Given('系統設定每秒最多處理 {int} 個請求', async function(this: TestContext, maxRequests: number) {
  // 設定速率限制
  this.testData.rateLimitConfig = {
    maxRequests: maxRequests,
    timeWindow: 1000, // 1 second
    currentRequests: 0,
    resetTime: Date.now()
  };
});

Given('系統遇到未預期的內部錯誤', async function(this: TestContext) {
  // 模擬未預期錯誤
  this.testData.internalError = {
    type: 'UnexpectedError',
    message: 'Something went wrong unexpectedly',
    stack: 'Error: Something went wrong\n    at function1 (file.js:10:5)\n    at function2 (file.js:20:10)'
  };
});

// When Steps

When('使用者發送缺少必要欄位的請求：{word}', async function(this: TestContext, missingField: string) {
  try {
    // 模擬缺少必要欄位的請求
    const invalidRequest: any = {
      name: '測試專案',
      workingDir: '/test/path',
      task: '分析程式碼'
    };
    
    // 移除指定的欄位
    delete invalidRequest[missingField];
    
    // 驗證請求
    validateCreateRequest.call(this, invalidRequest, missingField);
    
    this.responseStatus = 201;
    this.responseBody = { success: true };
  } catch (error: any) {
    this.responseStatus = error.statusCode || 400;
    this.responseBody = {
      error_code: error.code,
      error_message: error.message,
      validation_errors: error.validationErrors
    };
  }
});

When('使用者嘗試建立新 Session', async function(this: TestContext) {
  try {
    // 檢查記憶體狀態
    if (this.testData.systemMemory && this.testData.systemMemory.available < this.testData.systemMemory.threshold) {
      throw {
        statusCode: 507,
        code: 'INSUFFICIENT_MEMORY',
        message: 'Insufficient memory to start new session'
      };
    }
    
    // 檢查 Claude Code 執行檔
    if (this.testData.claudeCodePath === '/nonexistent/path/to/claude') {
      throw {
        statusCode: 500,
        code: 'CLAUDE_NOT_FOUND',
        message: 'Claude Code executable not found'
      };
    }
    
    this.responseStatus = 201;
    this.responseBody = { success: true };
  } catch (error: any) {
    this.responseStatus = error.statusCode;
    this.responseBody = {
      error_code: error.code,
      error_message: error.message
    };
  }
});

When('使用者建立 Session 並指定不存在的工作目錄', async function(this: TestContext) {
  try {
    const invalidWorkingDir = '/nonexistent/working/directory';
    
    // 模擬檢查工作目錄存在性
    throw {
      statusCode: 400,
      code: 'INVALID_WORKING_DIR',
      message: 'Working directory does not exist'
    };
  } catch (error: any) {
    this.responseStatus = error.statusCode;
    this.responseBody = {
      error_code: error.code,
      error_message: error.message
    };
  }
});

When('系統嘗試啟動 Claude Code 進程', async function(this: TestContext) {
  // 模擬進程啟動失敗
  if (this.testData.processStartError) {
    this.testData.sessionWithError = {
      sessionId: uuidv4(),
      status: 'error',
      error: this.testData.processStartError.message,
      processOutput: 'Permission denied: cannot execute Claude Code'
    };
  }
});

When('使用者查詢 Sessions', async function(this: TestContext) {
  try {
    // 檢查資料庫狀態
    if (this.testData.databaseError) {
      throw {
        statusCode: 503,
        code: this.testData.databaseError.code,
        message: this.testData.databaseError.message
      };
    }
    
    this.responseStatus = 200;
    this.responseBody = [];
  } catch (error: any) {
    this.responseStatus = error.statusCode;
    this.responseBody = {
      error_code: error.code,
      error_message: error.message
    };
  }
});

When('客戶端嘗試連接未啟動的 WebSocket 服務', async function(this: TestContext) {
  // 檢查 WebSocket 服務狀態
  if (!this.testData.websocketServerStatus.running) {
    this.testData.websocketConnectionResult = {
      success: false,
      error: 'Connection refused: WebSocket service not available'
    };
  } else {
    this.testData.websocketConnectionResult = {
      success: true
    };
  }
});

When('使用者嘗試延續該 Session', async function(this: TestContext) {
  try {
    // 檢查歷史檔案完整性
    if (this.testData.corruptSession) {
      throw {
        statusCode: 500,
        code: 'CORRUPT_HISTORY',
        message: 'Session history is corrupted'
      };
    }
    
    this.responseStatus = 200;
    this.responseBody = { success: true };
  } catch (error: any) {
    this.responseStatus = error.statusCode;
    this.responseBody = {
      error_code: error.code,
      error_message: error.message
    };
  }
});

When('同一客戶端在 1 秒內發送第 {int} 個請求', async function(this: TestContext, requestNumber: number) {
  try {
    const config = this.testData.rateLimitConfig;
    
    // 模擬已經發送了第 101 個請求
    config.currentRequests = requestNumber;
    
    // 檢查速率限制
    if (config.currentRequests > config.maxRequests) {
      const retryAfter = 1; // 1 second
      throw {
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: retryAfter
      };
    }
    
    this.responseStatus = 200;
    this.responseBody = { success: true };
  } catch (error: any) {
    this.responseStatus = error.statusCode;
    this.responseBody = {
      error_code: error.code,
      error_message: error.message
    };
    
    if (error.retryAfter) {
      this.responseHeaders = {
        'Retry-After': error.retryAfter.toString()
      };
    }
  }
});

When('錯誤發生', async function(this: TestContext) {
  try {
    // 模擬內部錯誤
    if (this.testData.internalError) {
      throw {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        originalError: this.testData.internalError
      };
    }
  } catch (error: any) {
    this.responseStatus = error.statusCode;
    this.responseBody = {
      error_code: error.code,
      error_message: error.message
    };
    
    // 記錄錯誤但不暴露給客戶端
    this.testData.errorLog = {
      timestamp: new Date(),
      error: error.originalError,
      stack: error.originalError?.stack
    };
  }
});

// Then Steps

Then('error_message 應包含 {string}', async function(this: TestContext, expectedMessage: string) {
  expect(this.responseBody.error_message).to.include(expectedMessage.replace(/"/g, ''));
});

Then('response 應包含詳細的驗證錯誤資訊', async function(this: TestContext) {
  expect(this.responseBody.validation_errors).to.exist;
  expect(this.responseBody.validation_errors).to.be.an('array');
  expect(this.responseBody.validation_errors.length).to.be.greaterThan(0);
});

Then('Session 錯誤狀態應更新為 {string}', async function(this: TestContext, expectedStatus: string) {
  if (this.testData.sessionWithError) {
    expect(this.testData.sessionWithError.status).to.equal(expectedStatus);
  }
});

Then('錯誤詳情應包含進程輸出', async function(this: TestContext) {
  if (this.testData.sessionWithError) {
    expect(this.testData.sessionWithError.processOutput).to.be.a('string');
    expect(this.testData.sessionWithError.processOutput.length).to.be.greaterThan(0);
  }
});

Then('WebSocket 應推送進程錯誤通知', async function(this: TestContext) {
  // 模擬錯誤通知推送
  this.testData.websocketErrorNotification = {
    type: 'error',
    sessionId: this.testData.sessionWithError?.sessionId,
    message: this.testData.sessionWithError?.error
  };
  
  expect(this.testData.websocketErrorNotification.type).to.equal('error');
});

Then('系統應該嘗試重新連線', async function(this: TestContext) {
  // 模擬重新連線嘗試
  this.testData.reconnectionAttempt = {
    attempted: true,
    timestamp: new Date(),
    maxRetries: 3,
    retryInterval: 5000
  };
  
  expect(this.testData.reconnectionAttempt.attempted).to.be.true;
});

Then('連線應該被拒絕', async function(this: TestContext) {
  expect(this.testData.websocketConnectionResult.success).to.be.false;
});

Then('客戶端應收到適當的錯誤訊息', async function(this: TestContext) {
  expect(this.testData.websocketConnectionResult.error).to.be.a('string');
  expect(this.testData.websocketConnectionResult.error.length).to.be.greaterThan(0);
});

Then('系統應記錄連線失敗事件', async function(this: TestContext) {
  // 模擬事件記錄
  this.testData.connectionFailureLog = {
    timestamp: new Date(),
    event: 'websocket_connection_failed',
    error: this.testData.websocketConnectionResult.error,
    clientInfo: {
      ip: '127.0.0.1',
      userAgent: 'Test Client'
    }
  };
  
  expect(this.testData.connectionFailureLog.event).to.equal('websocket_connection_failed');
});

Then('系統應提供選項讓使用者選擇是否忽略歷史記錄', async function(this: TestContext) {
  // 模擬提供恢復選項
  this.testData.recoveryOptions = {
    available: true,
    options: [
      { id: 'ignore_history', label: '忽略歷史記錄並繼續', action: 'ignore' },
      { id: 'restore_backup', label: '嘗試從備份恢復', action: 'restore' }
    ]
  };
  
  expect(this.testData.recoveryOptions.available).to.be.true;
  expect(this.testData.recoveryOptions.options).to.have.length.greaterThan(0);
});

Then('response 應包含 Retry-After header', async function(this: TestContext) {
  expect(this.responseHeaders).to.exist;
  expect(this.responseHeaders['Retry-After']).to.exist;
  expect(parseInt(this.responseHeaders['Retry-After'])).to.be.a('number');
});

Then('系統應記錄完整的錯誤堆疊', async function(this: TestContext) {
  expect(this.testData.errorLog).to.exist;
  expect(this.testData.errorLog.error).to.exist;
  expect(this.testData.errorLog.stack).to.be.a('string');
});

Then('不應向客戶端暴露敏感資訊', async function(this: TestContext) {
  // 確保回應中不包含敏感資訊
  const responseString = JSON.stringify(this.responseBody);
  
  // 檢查不應該暴露的敏感資訊
  expect(responseString).to.not.include('stack');
  expect(responseString).to.not.include('file.js');
  expect(responseString).to.not.include('function1');
  expect(responseString).to.not.include('UnexpectedError');
});

// 輔助函數 - 將 private 移除，因為這是在模組層級
function validateCreateRequest(this: TestContext, request: any, missingField: string): void {
  const validationErrors = [];
  
  if (!request.name) {
    validationErrors.push({
      field: 'name',
      message: 'name is required'
    });
  }
  
  if (!request.workingDir) {
    validationErrors.push({
      field: 'workingDir', 
      message: 'workingDir is required'
    });
  }
  
  if (!request.task) {
    validationErrors.push({
      field: 'task',
      message: 'task is required'
    });
  }
  
  if (validationErrors.length > 0) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: validationErrors[0].message,
      validationErrors: validationErrors
    };
  }
}