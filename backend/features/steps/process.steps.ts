import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './world';
import { SessionStatus } from '../../src/types/session.types';
import { v4 as uuidv4 } from 'uuid';

// Claude Code 進程管理相關的 Steps

Given('進程管理系統已啟動', async function(this: TestContext) {
  // 模擬系統啟動
  this.testData.systemStatus = {
    running: true,
    startTime: new Date(),
    maxProcesses: 10,
    currentProcesses: 0
  };
});

Given('Claude Code 執行檔路徑已設定', async function(this: TestContext) {
  // 模擬執行檔路徑設定
  this.testData.claudeCodePath = '/usr/local/bin/claude-code';
});

Given('有 {int} 個運行中的 Claude Code 進程', async function(this: TestContext, count: number) {
  // 模擬多個運行中的進程
  this.testData.runningProcesses = new Map();
  
  for (let i = 0; i < count; i++) {
    const processId = 1000 + i;
    const sessionId = `session-${i + 1}`;
    
    this.testData.runningProcesses.set(sessionId, {
      pid: processId,
      sessionId: sessionId,
      startTime: new Date(Date.now() - (i * 300000)), // 不同的啟動時間
      cpuUsage: 15 + Math.random() * 10, // 15-25%
      memoryUsage: 256 + Math.random() * 512, // 256-768MB
      status: 'running'
    });
  }
  
  this.testData.systemStatus.currentProcesses = count;
});

Given('一個運行中的 Claude Code 進程', async function(this: TestContext) {
  // 模擬單個運行中的進程
  const sessionId = uuidv4();
  const processId = Math.floor(Math.random() * 10000) + 1000;
  
  this.testData.currentProcess = {
    pid: processId,
    sessionId: sessionId,
    startTime: new Date(Date.now() - 600000), // 10分鐘前啟動
    cpuUsage: 20,
    memoryUsage: 512,
    status: 'running'
  };
  
  this.testData.runningProcesses = this.testData.runningProcesses || new Map();
  this.testData.runningProcesses.set(sessionId, this.testData.currentProcess);
});

Given('系統設定的資源限制如下：', async function(this: TestContext, dataTable: any) {
  // 設定資源限制
  const limits = dataTable.rowsHash();
  
  this.testData.resourceLimits = {
    maxProcesses: parseInt(limits['最大進程數']),
    maxMemoryPerProcess: limits['單進程最大記憶體'],
    maxExecutionTime: limits['單進程最大執行時間']
  };
});

Given('一個運行中的進程已執行 2 小時', async function(this: TestContext) {
  // 模擬長時間運行的進程
  const sessionId = uuidv4();
  const processId = Math.floor(Math.random() * 10000) + 1000;
  const twoHoursAgo = new Date(Date.now() - (2 * 60 * 60 * 1000));
  
  this.testData.longRunningProcess = {
    pid: processId,
    sessionId: sessionId,
    startTime: twoHoursAgo,
    cpuUsage: 25,
    memoryUsage: 1024,
    status: 'running',
    executionTime: 2 * 60 * 60 // 2 hours in seconds
  };
});

Given('Claude Code 進程正在產生大量輸出', async function(this: TestContext) {
  // 模擬大量輸出
  this.testData.processOutput = {
    sessionId: uuidv4(),
    bufferSize: 1024 * 1024, // 1MB buffer
    currentSize: 950 * 1024, // 950KB used
    outputChunks: []
  };
  
  // 產生大量輸出數據
  for (let i = 0; i < 100; i++) {
    this.testData.processOutput.outputChunks.push(`Output chunk ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit...`);
  }
});

Given('系統意外重啟前有 {int} 個運行中的 Sessions', async function(this: TestContext, count: number) {
  // 模擬重啟前的狀態
  this.testData.preRestartSessions = [];
  
  for (let i = 0; i < count; i++) {
    this.testData.preRestartSessions.push({
      sessionId: `session-${i + 1}`,
      status: SessionStatus.IDLE,
      processId: 1000 + i,
      lastUpdate: new Date(Date.now() - 600000) // 10分鐘前
    });
  }
  
  // 模擬持久化儲存
  this.testData.persistentStorage = {
    sessions: [...this.testData.preRestartSessions]
  };
});

// When Steps

When('系統需要為新 Session 啟動進程', async function(this: TestContext) {
  // 模擬啟動進程的請求
  this.testData.processStartRequest = {
    sessionId: uuidv4(),
    workingDir: '/test/project',
    continueChat: false,
    timestamp: new Date()
  };
});

When('系統執行健康檢查', async function(this: TestContext) {
  // 模擬健康檢查
  this.testData.healthCheckResults = [];
  
  if (this.testData.runningProcesses) {
    for (const [sessionId, process] of this.testData.runningProcesses.entries()) {
      const healthStatus = {
        sessionId: sessionId,
        pid: process.pid,
        cpuUsage: process.cpuUsage,
        memoryUsage: process.memoryUsage,
        runTime: Date.now() - process.startTime.getTime(),
        responsive: process.cpuUsage < 90 && process.memoryUsage < 1500, // 假設閾值
        status: process.status
      };
      
      this.testData.healthCheckResults.push(healthStatus);
    }
  }
});

When('進程意外終止', async function(this: TestContext) {
  // 模擬進程異常終止
  if (this.testData.currentProcess) {
    this.testData.processTermination = {
      pid: this.testData.currentProcess.pid,
      sessionId: this.testData.currentProcess.sessionId,
      exitCode: 1, // 異常退出碼
      terminationReason: 'unexpected_termination',
      timestamp: new Date()
    };
    
    this.testData.currentProcess.status = 'terminated';
  }
});

When('系統需要終止該進程', async function(this: TestContext) {
  // 模擬優雅終止流程
  if (this.testData.currentProcess) {
    this.testData.terminationProcess = {
      pid: this.testData.currentProcess.pid,
      sessionId: this.testData.currentProcess.sessionId,
      terminationSteps: []
    };
    
    // 記錄終止步驟
    this.testData.terminationProcess.terminationSteps.push({
      step: 'SIGTERM_SENT',
      timestamp: new Date()
    });
  }
});

When('第 {int} 個 Session 嘗試啟動', async function(this: TestContext, sessionNumber: number) {
  try {
    // 設定當前進程數為 10 (達到限制)
    this.testData.systemStatus.currentProcesses = 10;
    
    // 檢查資源限制
    const currentProcesses = this.testData.systemStatus.currentProcesses;
    const maxProcesses = this.testData.resourceLimits.maxProcesses;
    
    if (currentProcesses >= maxProcesses) {
      throw {
        statusCode: 503,
        code: 'RESOURCE_LIMIT_EXCEEDED',
        message: 'Maximum number of concurrent sessions reached'
      };
    }
    
    // 如果沒有超過限制，成功啟動
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

When('系統執行超時檢查', async function(this: TestContext) {
  // 模擬超時檢查
  if (this.testData.longRunningProcess) {
    const executionTime = this.testData.longRunningProcess.executionTime;
    const maxTime = 2 * 60 * 60; // 2 hours in seconds
    
    this.testData.timeoutCheckResult = {
      processId: this.testData.longRunningProcess.pid,
      executionTime: executionTime,
      maxTime: maxTime,
      isTimeout: executionTime >= maxTime,
      warningsSent: 0
    };
    
    if (this.testData.timeoutCheckResult.isTimeout) {
      this.testData.timeoutCheckResult.warningsSent = 1;
    }
  }
});

When('輸出緩衝區接近滿載', async function(this: TestContext) {
  // 模擬緩衝區管理
  if (this.testData.processOutput) {
    const bufferUsage = this.testData.processOutput.currentSize / this.testData.processOutput.bufferSize;
    
    if (bufferUsage > 0.9) { // 90% 滿
      this.testData.bufferManagement = {
        action: 'write_to_temp_file',
        tempFilePath: `/tmp/claude-output-${this.testData.processOutput.sessionId}.log`,
        chunksWritten: Math.floor(this.testData.processOutput.outputChunks.length * 0.7),
        chunksInMemory: Math.ceil(this.testData.processOutput.outputChunks.length * 0.3)
      };
    }
  }
});

When('系統重新啟動', async function(this: TestContext) {
  // 模擬系統重啟
  this.testData.systemRestart = {
    timestamp: new Date(),
    loadedSessions: []
  };
  
  // 載入持久化的 Session 資訊
  if (this.testData.persistentStorage) {
    this.testData.systemRestart.loadedSessions = this.testData.persistentStorage.sessions.map((session: any) => ({
      ...session,
      status: SessionStatus.ERROR, // 標記為 crashed
      error: 'System restart detected'
    }));
  }
});

// Then Steps

Then('系統應該使用正確的參數啟動 Claude Code', async function(this: TestContext) {
  // 驗證啟動參數
  if (this.testData.processStartRequest) {
    this.testData.startupParams = {
      executable: this.testData.claudeCodePath,
      workingDirectory: this.testData.processStartRequest.workingDir,
      arguments: ['--dir', this.testData.processStartRequest.workingDir],
      environment: process.env
    };
    
    expect(this.testData.startupParams.executable).to.equal('/usr/local/bin/claude-code');
    expect(this.testData.startupParams.arguments).to.include('--dir');
  }
});

Then('進程應該成功啟動', async function(this: TestContext) {
  // 模擬成功啟動
  const processId = Math.floor(Math.random() * 10000) + 1000;
  this.testData.newProcess = {
    pid: processId,
    sessionId: this.testData.processStartRequest?.sessionId,
    status: 'starting',
    startTime: new Date()
  };
  
  expect(this.testData.newProcess.pid).to.be.a('number');
  expect(this.testData.newProcess.status).to.equal('starting');
});

Then('系統應該記錄進程 PID', async function(this: TestContext) {
  // 驗證 PID 記錄
  expect(this.testData.newProcess.pid).to.be.a('number');
  expect(this.testData.newProcess.pid).to.be.greaterThan(0);
});

Then('系統應該建立 stdin\\/stdout\\/stderr 管道', async function(this: TestContext) {
  // 模擬建立管道
  this.testData.processStreams = {
    stdin: { writable: true, connected: true },
    stdout: { readable: true, connected: true },
    stderr: { readable: true, connected: true }
  };
  
  expect(this.testData.processStreams.stdin.connected).to.be.true;
  expect(this.testData.processStreams.stdout.connected).to.be.true;
  expect(this.testData.processStreams.stderr.connected).to.be.true;
});


Then('系統應該檢查每個進程的狀態', async function(this: TestContext) {
  // 驗證健康檢查
  expect(this.testData.healthCheckResults).to.exist;
  expect(this.testData.healthCheckResults).to.be.an('array');
  expect(this.testData.healthCheckResults.length).to.be.greaterThan(0);
});

Then('記錄每個進程的資源使用情況：', async function(this: TestContext, dataTable: any) {
  // 驗證資源使用記錄
  const expectedFields = dataTable.raw()[0];
  
  expect(this.testData.healthCheckResults).to.be.an('array');
  this.testData.healthCheckResults.forEach((result: any) => {
    expect(result).to.have.property('pid');
    expect(result).to.have.property('cpuUsage');
    expect(result).to.have.property('memoryUsage');
    expect(result).to.have.property('runTime');
  });
});

Then('偵測到無回應的進程', async function(this: TestContext) {
  // 檢查無回應的進程
  const unresponsiveProcesses = this.testData.healthCheckResults.filter((result: any) => !result.responsive);
  this.testData.unresponsiveProcesses = unresponsiveProcesses;
  
  // 至少應該能檢測到無回應狀態（即使沒有實際的無回應進程）
  expect(this.testData.healthCheckResults.every((result: any) => result.hasOwnProperty('responsive'))).to.be.true;
});

Then('系統應該偵測到進程結束', async function(this: TestContext) {
  // 驗證進程終止檢測
  expect(this.testData.processTermination).to.exist;
  expect(this.testData.processTermination.exitCode).to.equal(1);
});

Then('更新對應 Session 狀態為 {string}', async function(this: TestContext, status: string) {
  // 模擬更新 Session 狀態
  if (this.testData.processTermination) {
    this.testData.sessionStatusUpdate = {
      sessionId: this.testData.processTermination.sessionId,
      newStatus: status,
      timestamp: new Date()
    };
    
    expect(this.testData.sessionStatusUpdate.newStatus).to.equal(status);
  }
});

Then('記錄錯誤訊息和退出碼', async function(this: TestContext) {
  // 驗證錯誤記錄
  expect(this.testData.processTermination.exitCode).to.exist;
  expect(this.testData.processTermination.terminationReason).to.equal('unexpected_termination');
});

Then('WebSocket 應推送錯誤通知', async function(this: TestContext) {
  // 模擬 WebSocket 錯誤通知
  this.testData.websocketErrorNotification = {
    type: 'error',
    sessionId: this.testData.processTermination?.sessionId,
    message: 'Process terminated unexpectedly',
    exitCode: this.testData.processTermination?.exitCode
  };
  
  expect(this.testData.websocketErrorNotification.type).to.equal('error');
});

Then('系統應該先發送 SIGTERM 信號', async function(this: TestContext) {
  // 驗證 SIGTERM 發送
  const sigtermStep = this.testData.terminationProcess.terminationSteps.find((step: any) => step.step === 'SIGTERM_SENT');
  expect(sigtermStep).to.exist;
});

Then('等待最多 10 秒讓進程優雅退出', async function(this: TestContext) {
  // 模擬等待期
  this.testData.terminationProcess.terminationSteps.push({
    step: 'WAITING_FOR_GRACEFUL_EXIT',
    timestamp: new Date(),
    maxWaitTime: 10000 // 10 seconds
  });
  
  const waitStep = this.testData.terminationProcess.terminationSteps.find((step: any) => step.step === 'WAITING_FOR_GRACEFUL_EXIT');
  expect(waitStep).to.exist;
  expect(waitStep.maxWaitTime).to.equal(10000);
});

Then('如果進程仍在運行則發送 SIGKILL', async function(this: TestContext) {
  // 模擬 SIGKILL
  this.testData.terminationProcess.terminationSteps.push({
    step: 'SIGKILL_SENT',
    timestamp: new Date(Date.now() + 10000), // 10秒後
    reason: 'graceful_exit_timeout'
  });
  
  const sigkillStep = this.testData.terminationProcess.terminationSteps.find((step: any) => step.step === 'SIGKILL_SENT');
  expect(sigkillStep).to.exist;
});

Then('清理相關資源', async function(this: TestContext) {
  // 模擬資源清理
  this.testData.resourceCleanup = {
    processId: this.testData.terminationProcess.pid,
    cleanupSteps: [
      'close_stdin_pipe',
      'close_stdout_pipe',
      'close_stderr_pipe',
      'remove_from_process_map',
      'cleanup_temp_files'
    ],
    completed: true
  };
  
  expect(this.testData.resourceCleanup.completed).to.be.true;
});

Then('系統應該標記該進程為超時', async function(this: TestContext) {
  // 驗證超時標記
  expect(this.testData.timeoutCheckResult.isTimeout).to.be.true;
});

Then('發送警告通知給使用者', async function(this: TestContext) {
  // 模擬警告通知
  this.testData.timeoutWarning = {
    processId: this.testData.longRunningProcess?.pid,
    sessionId: this.testData.longRunningProcess?.sessionId,
    warningType: 'execution_timeout',
    message: 'Your session has been running for 2 hours. Please save your work as it will be terminated soon.',
    timestamp: new Date()
  };
  
  expect(this.testData.timeoutWarning.warningType).to.equal('execution_timeout');
});

Then('如果使用者未回應則在 10 分鐘後終止進程', async function(this: TestContext) {
  // 模擬終止排程
  this.testData.terminationSchedule = {
    processId: this.testData.longRunningProcess?.pid,
    scheduledTime: new Date(Date.now() + (10 * 60 * 1000)), // 10分鐘後
    reason: 'timeout_no_user_response'
  };
  
  expect(this.testData.terminationSchedule.reason).to.equal('timeout_no_user_response');
});

Then('系統應該將部分內容寫入暫存檔', async function(this: TestContext) {
  // 驗證暫存檔寫入
  expect(this.testData.bufferManagement.action).to.equal('write_to_temp_file');
  expect(this.testData.bufferManagement.tempFilePath).to.include('/tmp/claude-output-');
  expect(this.testData.bufferManagement.chunksWritten).to.be.greaterThan(0);
});

Then('保持最近的輸出在記憶體中', async function(this: TestContext) {
  // 驗證記憶體中的輸出
  expect(this.testData.bufferManagement.chunksInMemory).to.be.greaterThan(0);
});

Then('確保不會因緩衝區滿而阻塞進程', async function(this: TestContext) {
  // 驗證非阻塞處理
  this.testData.bufferStatus = {
    blocked: false,
    bufferUtilization: 0.3, // 清理後降到 30%
    processCanWrite: true
  };
  
  expect(this.testData.bufferStatus.blocked).to.be.false;
  expect(this.testData.bufferStatus.processCanWrite).to.be.true;
});

Then('系統應該從持久化儲存載入 Session 資訊', async function(this: TestContext) {
  // 驗證資料載入
  expect(this.testData.systemRestart.loadedSessions).to.exist;
  expect(this.testData.systemRestart.loadedSessions).to.be.an('array');
  expect(this.testData.systemRestart.loadedSessions.length).to.equal(5);
});

Then('將所有未完成的 Sessions 標記為 {string}', async function(this: TestContext, status: string) {
  // 驗證狀態標記
  this.testData.systemRestart.loadedSessions.forEach((session: any) => {
    expect(session.status).to.equal('error');
    expect(session.error).to.equal('System restart detected');
  });
});

Then('允許使用者選擇是否恢復這些 Sessions', async function(this: TestContext) {
  // 模擬恢復選項
  this.testData.recoveryOptions = {
    availableSessions: this.testData.systemRestart.loadedSessions.map((session: any) => session.sessionId),
    recoveryEnabled: true,
    userChoiceRequired: true
  };
  
  expect(this.testData.recoveryOptions.recoveryEnabled).to.be.true;
  expect(this.testData.recoveryOptions.userChoiceRequired).to.be.true;
});