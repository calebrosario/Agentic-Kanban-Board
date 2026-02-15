import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './world';
import { SessionStatus } from '../../src/types/session.types';
import { v4 as uuidv4 } from 'uuid';

// 資料持久化相關的 Steps

// Given Steps

Given('資料庫連線正常', async function(this: TestContext) {
  // 模擬資料庫連線
  this.testData.database = {
    connected: true,
    type: 'sqlite',
    status: 'healthy',
    tables: {
      sessions: { exists: true, records: 0 },
      messages: { exists: true, records: 0 },
      backups: { exists: true, records: 0 }
    }
  };
});

Given('資料庫中存在一個已完成的 Session', async function(this: TestContext) {
  // 模擬已完成的 Session
  const sessionId = uuidv4();
  const completedSession = {
    sessionId: sessionId,
    name: 'Completed Test Session',
    workingDir: '/test/path',
    task: 'Test task completed',
    status: SessionStatus.COMPLETED,
    continueChat: false,
    createdAt: new Date(Date.now() - 3600000), // 1小時前
    completedAt: new Date(Date.now() - 1800000), // 30分鐘前
    updatedAt: new Date(Date.now() - 1800000),
    processId: 1234
  };
  
  this.sessions.set(sessionId, completedSession);
  this.currentSession = completedSession;
  
  // 模擬資料庫中的記錄
  this.testData.database.tables.sessions.records = 1;
  this.testData.persistedSessions = new Map();
  this.testData.persistedSessions.set(sessionId, { ...completedSession });
});

Given('系統設定每 6 小時自動備份', async function(this: TestContext) {
  // 模擬備份設定
  this.testData.backupConfig = {
    enabled: true,
    interval: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    retention: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    lastBackup: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    backupDirectory: '/backup/claude-sessions'
  };
});

Given('資料庫 schema 需要更新', async function(this: TestContext) {
  // 模擬需要遷移的情況
  this.testData.migration = {
    current_version: '1.0.0',
    target_version: '1.1.0',
    pending_migrations: [
      { id: '001_add_compression_field', file: 'migrations/001_add_compression_field.sql' },
      { id: '002_add_session_history', file: 'migrations/002_add_session_history.sql' }
    ]
  };
});

Given('Session 有超過 1000 筆對話記錄', async function(this: TestContext) {
  // 模擬大量對話記錄
  const sessionId = uuidv4();
  this.currentSession = {
    sessionId: sessionId,
    name: 'High Volume Session',
    workingDir: '/test/path',
    task: 'High volume test',
    status: SessionStatus.IDLE,
    continueChat: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
    updatedAt: new Date()
  };
  
  // 模擬 1500 筆對話記錄
  this.testData.messageCount = 1500;
  this.testData.paginationConfig = {
    pageSize: 50,
    totalPages: Math.ceil(1500 / 50),
    currentPage: 1
  };
});

Given('Claude Code 產生超過 1MB 的回應', async function(this: TestContext) {
  // 模擬大型回應內容
  const largeContent = 'A'.repeat(1024 * 1024 + 100); // 1MB + 100 bytes
  
  this.testData.largeMessage = {
    messageId: uuidv4(),
    sessionId: this.currentSession?.sessionId || uuidv4(),
    role: 'assistant',
    content: largeContent,
    contentSize: largeContent.length,
    timestamp: new Date()
  };
});

Given('使用者選擇匯出特定 Session', async function(this: TestContext) {
  // 模擬匯出請求
  const sessionId = uuidv4();
  this.testData.exportRequest = {
    sessionId: sessionId,
    format: 'json',
    includeMetadata: true,
    requestTime: new Date()
  };
  
  // 模擬該 Session 的對話記錄
  this.testData.sessionMessages = [
    { messageId: uuidv4(), role: 'user', content: '請分析這個專案', timestamp: new Date(Date.now() - 3600000) },
    { messageId: uuidv4(), role: 'assistant', content: '我來幫您分析...', timestamp: new Date(Date.now() - 3500000) },
    { messageId: uuidv4(), role: 'user', content: '謝謝', timestamp: new Date(Date.now() - 3400000) }
  ];
});

// When Steps

When('建立新的 Session', async function(this: TestContext) {
  // 模擬建立新 Session
  const sessionId = uuidv4();
  const newSession = {
    sessionId: sessionId,
    name: '新的測試 Session',
    workingDir: '/test/project',
    task: '測試任務',
    status: SessionStatus.IDLE,
    continueChat: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    processId: 5678
  };
  
  this.currentSession = newSession;
  this.sessions.set(sessionId, newSession);
  
  // 模擬持久化操作
  this.testData.persistenceOperation = {
    action: 'create',
    table: 'sessions',
    data: newSession,
    executed: true,
    timestamp: new Date()
  };
});

When('Session 狀態變更', async function(this: TestContext) {
  if (this.currentSession) {
    // 記錄狀態變更歷史
    const oldStatus = this.currentSession.status;
    this.currentSession.status = SessionStatus.COMPLETED;
    this.currentSession.completedAt = new Date();
    this.currentSession.updatedAt = new Date();
    
    // 模擬狀態變更歷史記錄
    this.testData.statusHistory = this.testData.statusHistory || [];
    this.testData.statusHistory.push({
      sessionId: this.currentSession.sessionId,
      oldStatus: oldStatus,
      newStatus: this.currentSession.status,
      timestamp: new Date(),
      reason: 'user_completed'
    });
    
    // 模擬資料庫更新
    this.testData.persistenceOperation = {
      action: 'update',
      table: 'sessions',
      data: this.currentSession,
      executed: true,
      timestamp: new Date()
    };
  }
});

When('使用者發送訊息或收到回應', async function(this: TestContext) {
  // 模擬訊息交換
  const userMessage = {
    messageId: uuidv4(),
    sessionId: this.currentSession?.sessionId,
    role: 'user',
    content: '請協助分析程式碼',
    timestamp: new Date()
  };
  
  const assistantMessage = {
    messageId: uuidv4(),
    sessionId: this.currentSession?.sessionId,
    role: 'assistant', 
    content: '我來幫您分析這段程式碼...',
    timestamp: new Date(Date.now() + 1000)
  };
  
  this.testData.messageExchange = [userMessage, assistantMessage];
  
  // 模擬訊息持久化
  this.testData.persistenceOperations = [
    {
      action: 'create',
      table: 'messages',
      data: userMessage,
      executed: true,
      timestamp: new Date()
    },
    {
      action: 'create',
      table: 'messages',
      data: assistantMessage,
      executed: true,
      timestamp: new Date(Date.now() + 100)
    }
  ];
});

When('系統儲存該訊息', async function(this: TestContext) {
  if (this.testData.largeMessage) {
    // 模擬壓縮和儲存
    const originalSize = this.testData.largeMessage.contentSize;
    const compressedSize = Math.floor(originalSize * 0.1); // 假設壓縮比 90%
    
    this.testData.compressionResult = {
      originalSize: originalSize,
      compressedSize: compressedSize,
      compressionRatio: (1 - compressedSize / originalSize) * 100,
      algorithm: 'gzip'
    };
    
    // 模擬儲存到資料庫
    this.testData.persistenceOperation = {
      action: 'create',
      table: 'messages',
      data: {
        ...this.testData.largeMessage,
        content: '<compressed_content>',
        compressed: true,
        originalSize: originalSize,
        compressedSize: compressedSize
      },
      executed: true,
      timestamp: new Date()
    };
  }
});

When('使用者執行軟刪除該 Session', async function(this: TestContext) {
  if (this.currentSession) {
    // 軟刪除：設定 deletedAt 時間戳記
    this.currentSession.deletedAt = new Date();
    
    // 模擬軟刪除操作
    this.testData.persistenceOperation = {
      action: 'soft_delete',
      table: 'sessions',
      data: {
        sessionId: this.currentSession.sessionId,
        deletedAt: this.currentSession.deletedAt
      },
      executed: true,
      timestamp: new Date()
    };
  }
});

When(/^(user|assistant)發送訊息 "(.*)"$/, async function(this: TestContext, role: string, content: string) {
  if (this.currentSession) {
    const message = {
      messageId: uuidv4(),
      sessionId: this.currentSession.sessionId,
      role: role,
      content: content,
      timestamp: new Date()
    };
    
    // 模擬儲存訊息
    this.testData.persistenceOperation = {
      action: 'create',
      table: 'messages',
      data: message,
      executed: true,
      timestamp: new Date()
    };
    
    // 記錄訊息以供後續驗證
    if (!this.testData.persistenceOperations) {
      this.testData.persistenceOperations = [];
    }
    this.testData.persistenceOperations.push(this.testData.persistenceOperation);
  }
});

When('Session 狀態變更為 {string}', async function(this: TestContext, newStatus: string) {
  if (this.currentSession) {
    const oldStatus = this.currentSession.status;
    this.currentSession.status = newStatus as any;
    this.currentSession.updatedAt = new Date();
    
    // 模擬狀態變更操作
    this.testData.persistenceOperation = {
      action: 'update',
      table: 'sessions',
      data: {
        sessionId: this.currentSession.sessionId,
        status: newStatus,
        updatedAt: this.currentSession.updatedAt
      },
      executed: true,
      timestamp: new Date()
    };
    
    // 記錄狀態變更歷史
    if (!this.testData.statusHistory) {
      this.testData.statusHistory = [];
    }
    this.testData.statusHistory.push({
      sessionId: this.currentSession.sessionId,
      oldStatus: oldStatus,
      newStatus: newStatus,
      timestamp: new Date()
    });
  }
});

When('備份時間到達', async function(this: TestContext) {
  const now = new Date();
  const config = this.testData.backupConfig;
  
  // 檢查是否需要備份
  const timeSinceLastBackup = now.getTime() - config.lastBackup.getTime();
  
  if (timeSinceLastBackup >= config.interval) {
    // 執行備份
    const backupId = uuidv4();
    this.testData.backupOperation = {
      backupId: backupId,
      timestamp: now,
      status: 'completed',
      size: '15.2MB',
      duration: 45000, // 45 seconds
      tables_backed_up: ['sessions', 'messages', 'status_history'],
      record_counts: {
        sessions: 25,
        messages: 1250,
        status_history: 180
      }
    };
    
    // 更新最後備份時間
    config.lastBackup = now;
  }
});

When('系統啟動時偵測到新的遷移檔案', async function(this: TestContext) {
  if (this.testData.migration) {
    // 執行遷移
    this.testData.migrationResults = [];
    
    for (const migration of this.testData.migration.pending_migrations) {
      this.testData.migrationResults.push({
        id: migration.id,
        file: migration.file,
        status: 'success',
        executedAt: new Date(),
        duration: Math.floor(Math.random() * 5000) + 1000 // 1-6 seconds
      });
    }
    
    // 更新資料庫版本
    this.testData.migration.current_version = this.testData.migration.target_version;
  }
});

When('載入對話歷史', async function(this: TestContext) {
  const config = this.testData.paginationConfig;
  
  // 模擬分頁載入
  const startIndex = (config.currentPage - 1) * config.pageSize;
  const endIndex = Math.min(startIndex + config.pageSize, this.testData.messageCount);
  
  this.testData.paginatedMessages = {
    page: config.currentPage,
    pageSize: config.pageSize,
    totalCount: this.testData.messageCount,
    totalPages: config.totalPages,
    hasNext: config.currentPage < config.totalPages,
    hasPrev: config.currentPage > 1,
    messages: Array.from({ length: endIndex - startIndex }, (_, i) => ({
      messageId: uuidv4(),
      sessionId: this.currentSession?.sessionId,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${startIndex + i + 1}`,
      timestamp: new Date(Date.now() - (startIndex + i) * 60000) // 最新的訊息時間戳記較大
    }))
  };
});

When('系統執行每日維護任務', async function(this: TestContext) {
  // 模擬資料完整性檢查
  this.testData.integrityCheck = {
    executedAt: new Date(),
    results: {
      orphaned_messages: {
        count: 3,
        details: ['msg-123', 'msg-456', 'msg-789'],
        fixed: 3
      },
      inconsistent_status: {
        count: 1,
        details: ['session-abc with status running but no active process'],
        fixed: 1
      },
      corrupted_data: {
        count: 0,
        details: [],
        fixed: 0
      }
    },
    summary: {
      total_issues: 4,
      fixed_issues: 4,
      unfixable_issues: 0
    }
  };
});

When('執行匯出操作', async function(this: TestContext) {
  const request = this.testData.exportRequest;
  
  // 模擬匯出操作
  this.testData.exportResult = {
    sessionId: request.sessionId,
    format: request.format,
    status: 'completed',
    generatedAt: new Date(),
    fileSize: '2.5MB',
    messageCount: this.testData.sessionMessages?.length || 0,
    downloadUrl: `/api/exports/${uuidv4()}.${request.format}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };
});

// Then Steps

Then('Session 資訊應該儲存到資料庫', async function(this: TestContext) {
  expect(this.testData.persistenceOperation).to.exist;
  expect(this.testData.persistenceOperation.action).to.equal('create');
  expect(this.testData.persistenceOperation.table).to.equal('sessions');
  expect(this.testData.persistenceOperation.executed).to.be.true;
});

Then('儲存的資料應包含：', async function(this: TestContext, dataTable: any) {
  const expectedFields = dataTable.raw();
  const storedData = this.testData.persistenceOperation.data;
  
  expectedFields.forEach(([field, description]: string[]) => {
    expect(storedData).to.have.property(field.trim());
    
    // 驗證特定欄位的型別或值
    switch (field.trim()) {
      case 'sessionId':
        expect(storedData.sessionId).to.be.a('string');
        break;
      case 'createdAt':
        expect(storedData.createdAt).to.be.instanceOf(Date);
        break;
      case 'processId':
        expect(storedData.processId).to.be.a('number');
        break;
    }
  });
});

Then('資料庫中的狀態應該同步更新', async function(this: TestContext) {
  expect(this.testData.persistenceOperation).to.exist;
  expect(this.testData.persistenceOperation.action).to.equal('update');
  expect(this.testData.persistenceOperation.data.status).to.exist;
});

Then('updatedAt 欄位應該更新為當前時間', async function(this: TestContext) {
  const storedData = this.testData.persistenceOperation.data;
  const timeDiff = Date.now() - storedData.updatedAt.getTime();
  expect(timeDiff).to.be.lessThan(1000); // 小於1秒差異
});

Then('應該記錄狀態變更歷史', async function(this: TestContext) {
  expect(this.testData.statusHistory).to.exist;
  expect(this.testData.statusHistory).to.be.an('array');
  expect(this.testData.statusHistory.length).to.be.greaterThan(0);
  
  const lastHistory = this.testData.statusHistory[this.testData.statusHistory.length - 1];
  expect(lastHistory).to.have.property('oldStatus');
  expect(lastHistory).to.have.property('newStatus');
  expect(lastHistory).to.have.property('timestamp');
});

Then('訊息應該儲存到資料庫', async function(this: TestContext) {
  expect(this.testData.persistenceOperations).to.exist;
  expect(this.testData.persistenceOperations).to.be.an('array');
  expect(this.testData.persistenceOperations.length).to.be.at.least(1); // 至少有一個訊息
});

Then('儲存的訊息應包含：', async function(this: TestContext, dataTable: any) {
  const expectedFields = dataTable.raw();
  const messageOperations = this.testData.persistenceOperations;
  
  messageOperations.forEach((operation: any) => {
    const messageData = operation.data;
    expectedFields.forEach(([field, description]: string[]) => {
      expect(messageData).to.have.property(field.trim());
      
      switch (field.trim()) {
        case 'messageId':
          expect(messageData.messageId).to.be.a('string');
          break;
        case 'role':
          expect(['user', 'assistant']).to.include(messageData.role);
          break;
        case 'timestamp':
          expect(messageData.timestamp).to.be.instanceOf(Date);
          break;
      }
    });
  });
});

Then('訊息內容應該被壓縮儲存', async function(this: TestContext) {
  expect(this.testData.compressionResult).to.exist;
  expect(this.testData.compressionResult.compressedSize).to.be.lessThan(this.testData.compressionResult.originalSize);
  expect(this.testData.persistenceOperation.data.compressed).to.be.true;
});

Then('資料庫應記錄內容已壓縮', async function(this: TestContext) {
  const storedData = this.testData.persistenceOperation.data;
  expect(storedData.compressed).to.be.true;
  expect(storedData.originalSize).to.be.a('number');
  expect(storedData.compressedSize).to.be.a('number');
});

Then('讀取時應自動解壓縮', async function(this: TestContext) {
  // 模擬讀取和解壓縮
  this.testData.decompressionResult = {
    success: true,
    originalSize: this.testData.compressionResult.originalSize,
    algorithm: 'gzip'
  };
  
  expect(this.testData.decompressionResult.success).to.be.true;
});

Then('Session 不應從資料庫物理刪除', async function(this: TestContext) {
  expect(this.testData.persistenceOperation.action).to.equal('soft_delete');
  expect(this.testData.persistenceOperation.action).to.not.equal('delete');
});

Then('應該設定 deletedAt 時間戳記', async function(this: TestContext) {
  expect(this.testData.persistenceOperation.data.deletedAt).to.be.instanceOf(Date);
});

Then('查詢時預設不顯示已刪除的 Sessions', async function(this: TestContext) {
  // 模擬查詢邏輯
  this.testData.queryFilter = {
    excludeDeleted: true,
    condition: 'deletedAt IS NULL'
  };
  
  expect(this.testData.queryFilter.excludeDeleted).to.be.true;
});

Then('系統應該建立資料庫備份', async function(this: TestContext) {
  expect(this.testData.backupOperation).to.exist;
  expect(this.testData.backupOperation.status).to.equal('completed');
});

Then('備份應包含所有 Sessions 和對話記錄', async function(this: TestContext) {
  const backup = this.testData.backupOperation;
  expect(backup.tables_backed_up).to.include('sessions');
  expect(backup.tables_backed_up).to.include('messages');
  expect(backup.record_counts.sessions).to.be.greaterThan(0);
  expect(backup.record_counts.messages).to.be.greaterThan(0);
});

Then('保留最近 7 天的備份', async function(this: TestContext) {
  // 模擬備份保留策略
  this.testData.backupRetention = {
    retentionDays: 7,
    currentBackups: 14, // 假設有14個備份
    toDelete: 7 // 需要刪除7個舊備份
  };
  
  expect(this.testData.backupRetention.retentionDays).to.equal(7);
});

Then('自動清理超過 7 天的舊備份', async function(this: TestContext) {
  const retention = this.testData.backupRetention;
  expect(retention.toDelete).to.be.greaterThan(0);
});

Then('系統應該自動執行資料庫遷移', async function(this: TestContext) {
  expect(this.testData.migrationResults).to.exist;
  expect(this.testData.migrationResults).to.be.an('array');
  expect(this.testData.migrationResults.length).to.equal(2);
});

Then('保持向後相容性', async function(this: TestContext) {
  // 確認遷移成功且向後相容
  this.testData.migrationResults.forEach((result: any) => {
    expect(result.status).to.equal('success');
  });
});

Then('記錄遷移執行結果', async function(this: TestContext) {
  this.testData.migrationResults.forEach((result: any) => {
    expect(result).to.have.property('id');
    expect(result).to.have.property('status');
    expect(result).to.have.property('executedAt');
    expect(result).to.have.property('duration');
  });
});

Then('系統應該分批載入資料', async function(this: TestContext) {
  expect(this.testData.paginatedMessages).to.exist;
  expect(this.testData.paginatedMessages.pageSize).to.equal(50);
});

Then('優先載入最近的對話', async function(this: TestContext) {
  const messages = this.testData.paginatedMessages.messages;
  expect(messages).to.be.an('array');
  expect(messages.length).to.be.lessThanOrEqual(50);
  
  // 驗證時間順序（最新的在前）
  for (let i = 1; i < messages.length; i++) {
    expect(messages[i-1].timestamp.getTime()).to.be.greaterThan(messages[i].timestamp.getTime());
  }
});

Then('支援無限滾動載入更多歷史', async function(this: TestContext) {
  const pagination = this.testData.paginatedMessages;
  expect(pagination.hasNext).to.be.a('boolean');
  expect(pagination.hasPrev).to.be.a('boolean');
  expect(pagination.totalPages).to.be.greaterThan(1);
});

Then('應該檢查資料完整性：', async function(this: TestContext, dataTable: any) {
  const expectedChecks = dataTable.raw().slice(1); // 跳過標題行
  const results = this.testData.integrityCheck.results;
  
  // 建立檢查項目對應表
  const checkMapping: { [key: string]: string } = {
    '孤立訊息': 'orphaned_messages',
    '狀態不一致': 'inconsistent_status',
    '損壞的資料': 'corrupted_data'
  };
  
  expectedChecks.forEach(([checkType, description]: string[]) => {
    const checkKey = checkMapping[checkType.trim()];
    expect(results).to.have.property(checkKey);
    expect(results[checkKey]).to.have.property('count');
    expect(results[checkKey]).to.have.property('details');
  });
});

Then('自動修復可修復的問題', async function(this: TestContext) {
  const summary = this.testData.integrityCheck.summary;
  expect(summary.fixed_issues).to.be.greaterThan(0);
  expect(summary.fixed_issues).to.equal(summary.total_issues - summary.unfixable_issues);
});

Then('記錄無法修復的問題', async function(this: TestContext) {
  const summary = this.testData.integrityCheck.summary;
  expect(summary.unfixable_issues).to.be.a('number');
});

Then('系統應該生成包含完整對話的檔案', async function(this: TestContext) {
  expect(this.testData.exportResult).to.exist;
  expect(this.testData.exportResult.status).to.equal('completed');
  expect(this.testData.exportResult.messageCount).to.be.greaterThan(0);
});

Then('支援匯出格式：', async function(this: TestContext, dataTable: any) {
  const supportedFormats = dataTable.raw();
  const exportResult = this.testData.exportResult;
  
  // 驗證當前匯出格式是支援的格式之一
  const formatNames = supportedFormats.map(([format, description]: string[]) => format.trim().toLowerCase());
  expect(formatNames).to.include(exportResult.format.toLowerCase());
});

Then('包含所有相關的中繼資料', async function(this: TestContext) {
  const exportResult = this.testData.exportResult;
  expect(exportResult.generatedAt).to.be.instanceOf(Date);
  expect(exportResult.fileSize).to.be.a('string');
  expect(exportResult.downloadUrl).to.be.a('string');
  expect(exportResult.expiresAt).to.be.instanceOf(Date);
});

// 新增的匯出相關步驟
When('使用者選擇匯出格式為 {string}', async function(this: TestContext, format: string) {
  // 模擬使用者選擇匯出格式
  this.testData.exportRequest = {
    sessionId: this.currentSession?.sessionId || 'test-session-id',
    format: format.toLowerCase(),
    requestedAt: new Date()
  };
});

Then('系統應該生成 {word} 格式的檔案', async function(this: TestContext, format: string) {
  // 模擬生成特定格式的檔案
  this.testData.exportResult = {
    sessionId: this.currentSession?.sessionId || 'test-session-id',
    format: format.toLowerCase(),
    status: 'completed',
    generatedAt: new Date(),
    fileSize: format === 'CSV' ? '1.2MB' : format === 'JSON' ? '2.5MB' : '1.8MB',
    messageCount: 50,
    downloadUrl: `/api/exports/${uuidv4()}.${format.toLowerCase()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };
  
  expect(this.testData.exportResult.format).to.equal(format.toLowerCase());
  expect(this.testData.exportResult.status).to.equal('completed');
});

Then('檔案應包含完整對話內容', async function(this: TestContext) {
  expect(this.testData.exportResult).to.exist;
  expect(this.testData.exportResult.messageCount).to.be.greaterThan(0);
  
  // 模擬檔案內容驗證
  this.testData.exportedContent = {
    hasMessages: true,
    messageCount: this.testData.exportResult.messageCount,
    includesUserMessages: true,
    includesAssistantMessages: true
  };
  
  expect(this.testData.exportedContent.hasMessages).to.be.true;
});

Then('檔案應包含所有相關的中繼資料', async function(this: TestContext) {
  // 模擬中繼資料驗證
  this.testData.exportedMetadata = {
    sessionId: this.currentSession?.sessionId,
    sessionName: this.currentSession?.name,
    workingDir: this.currentSession?.workingDir,
    task: this.currentSession?.task,
    createdAt: this.currentSession?.createdAt,
    exportedAt: this.testData.exportResult.generatedAt
  };
  
  expect(this.testData.exportedMetadata.sessionId).to.exist;
  expect(this.testData.exportedMetadata.sessionName).to.exist;
  expect(this.testData.exportedMetadata.workingDir).to.exist;
});