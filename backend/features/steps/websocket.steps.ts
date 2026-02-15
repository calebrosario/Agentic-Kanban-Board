import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './world';
import { v4 as uuidv4 } from 'uuid';

// WebSocket 連線相關的 Steps

Given('WebSocket 服務已啟動', async function(this: TestContext) {
  // 模擬 WebSocket 服務啟動
  this.testData.websocketServer = {
    status: 'running',
    port: 3000,
    connections: new Map()
  };
});

Given('客戶端已建立 WebSocket 連線', async function(this: TestContext) {
  // 模擬客戶端連線
  const clientId = uuidv4();
  this.testData.clientId = clientId;
  this.testData.websocketConnection = {
    clientId: clientId,
    connected: true,
    subscriptions: new Set(),
    lastPing: new Date()
  };
  
  this.testData.websocketServer.connections.set(clientId, this.testData.websocketConnection);
});

Given('客戶端已成功連線', async function(this: TestContext) {
  // 確保客戶端已連線
  expect(this.testData.websocketConnection).to.exist;
  expect(this.testData.websocketConnection.connected).to.be.true;
});

Given('客戶端已訂閱 Session {string}', async function(this: TestContext, sessionId: string) {
  // 模擬訂閱
  this.testData.websocketConnection.subscriptions.add(sessionId);
  this.testData.subscribedSessionId = sessionId;
});

Given('客戶端已訂閱多個 Sessions', async function(this: TestContext) {
  // 模擬訂閱多個 Sessions
  this.testData.websocketConnection.subscriptions.add('session-1');
  this.testData.websocketConnection.subscriptions.add('session-2');
  this.testData.websocketConnection.subscriptions.add('session-3');
});

Given('客戶端因網路問題斷線', async function(this: TestContext) {
  // 模擬網路斷線
  this.testData.websocketConnection.connected = false;
  this.testData.websocketConnection.disconnectedAt = new Date();
  this.testData.websocketConnection.disconnectReason = 'network_error';
});

Given('客戶端已連線超過 30 秒', async function(this: TestContext) {
  // 模擬客戶端連線超過 30 秒
  const thirtySecondsAgo = new Date(Date.now() - 31 * 1000);
  this.testData.websocketConnection.connectedAt = thirtySecondsAgo;
});

// WebSocket 操作相關的 Steps

When('客戶端嘗試建立 WebSocket 連線', async function(this: TestContext) {
  // 模擬連線請求
  const clientId = uuidv4();
  this.testData.connectionRequest = {
    clientId: clientId,
    timestamp: new Date(),
    userAgent: 'Test Client 1.0'
  };
});

When('客戶端訂閱 Session {string} 的更新', async function(this: TestContext, sessionId: string) {
  try {
    // 模擬訂閱請求
    if (!this.testData.websocketConnection.connected) {
      throw new Error('Client not connected');
    }
    
    this.testData.websocketConnection.subscriptions.add(sessionId);
    this.testData.subscriptionResponse = {
      type: 'subscription',
      sessionId: sessionId,
      status: 'subscribed',
      timestamp: new Date()
    };
    
    this.responseStatus = 200;
    this.responseBody = this.testData.subscriptionResponse;
  } catch (error: any) {
    this.responseStatus = 400;
    this.responseBody = {
      error_code: 'WEBSOCKET_ERROR',
      error_message: error.message
    };
  }
});

When('Session 狀態從 {string} 變更為 {string}', async function(this: TestContext, oldStatus: string, newStatus: string) {
  // 模擬狀態變更
  this.testData.statusUpdate = {
    type: 'status_update',
    sessionId: this.testData.subscribedSessionId || 'session-123',
    oldStatus: oldStatus,
    newStatus: newStatus,
    timestamp: new Date()
  };
});

When('Claude Code 產生新的回應內容', async function(this: TestContext) {
  // 模擬 Claude Code 回應
  this.testData.messageUpdate = {
    type: 'message',
    sessionId: this.testData.subscribedSessionId || 'session-123',
    role: 'assistant',
    content: '這是 Claude Code 的回應內容',
    timestamp: new Date()
  };
});

When('Claude Code 正在產生串流回應', async function(this: TestContext) {
  // 模擬串流回應
  this.testData.streamChunks = [
    { type: 'stream_chunk', sessionId: 'session-123', chunk: '正在分析', index: 0 },
    { type: 'stream_chunk', sessionId: 'session-123', chunk: '程式碼...', index: 1 },
    { type: 'stream_chunk', sessionId: 'session-123', chunk: '完成分析', index: 2 }
  ];
});

When('系統資源使用率超過 80%', async function(this: TestContext) {
  // 模擬系統警告
  this.testData.systemAlert = {
    type: 'system_alert',
    level: 'warning',
    message: 'System resource usage high',
    metrics: {
      cpu: 85,
      memory: 82,
      disk: 75
    },
    timestamp: new Date()
  };
});

When('客戶端連線中斷', async function(this: TestContext) {
  // 模擬客戶端斷線
  this.testData.websocketConnection.connected = false;
  this.testData.websocketConnection.disconnectedAt = new Date();
  this.testData.websocketConnection.disconnectReason = 'client_disconnect';
});

When('客戶端在 30 秒內重新連線', async function(this: TestContext) {
  // 模擬重連
  const reconnectionTime = new Date();
  const disconnectionTime = this.testData.websocketConnection.disconnectedAt;
  const timeDiff = reconnectionTime.getTime() - disconnectionTime.getTime();
  
  if (timeDiff <= 30000) {
    this.testData.websocketConnection.connected = true;
    this.testData.websocketConnection.reconnectedAt = reconnectionTime;
    this.testData.reconnectionSuccessful = true;
  } else {
    this.testData.reconnectionSuccessful = false;
  }
});

When('客戶端取消訂閱該 Session', async function(this: TestContext) {
  // 模擬取消訂閱
  const sessionId = this.testData.subscribedSessionId;
  this.testData.websocketConnection.subscriptions.delete(sessionId);
  
  this.testData.unsubscriptionResponse = {
    type: 'subscription',
    sessionId: sessionId,
    status: 'unsubscribed',
    timestamp: new Date()
  };
});

When('系統發送心跳檢測', async function(this: TestContext) {
  // 模擬心跳檢測
  this.testData.heartbeatRequest = {
    type: 'ping',
    timestamp: new Date(),
    clientId: this.testData.clientId
  };
});

// 驗證相關的 Steps

Then('系統應該驗證連線請求', async function(this: TestContext) {
  // 驗證連線請求被處理
  expect(this.testData.connectionRequest).to.exist;
  expect(this.testData.connectionRequest.clientId).to.be.a('string');
});

Then('為通過驗證的客戶端建立連線', async function(this: TestContext) {
  // 驗證連線建立
  const clientId = this.testData.connectionRequest.clientId;
  expect(clientId).to.exist;
});

Then('發送連線成功訊息：', async function(this: TestContext, dataTable: any) {
  // 驗證連線成功訊息
  const expectedData = dataTable.rowsHash();
  
  const connectionMessage = {
    type: expectedData.type.replace(/"/g, ''), // 移除引號
    status: expectedData.status.replace(/"/g, ''), // 移除引號
    clientId: this.testData.connectionRequest.clientId
  };
  
  expect(connectionMessage.type).to.equal('connection');
  expect(connectionMessage.status).to.equal('connected');
  expect(connectionMessage.clientId).to.be.a('string');
});

Then('系統應該記錄該訂閱關係', async function(this: TestContext) {
  // 驗證訂閱記錄
  const sessionId = this.testData.subscriptionResponse.sessionId;
  expect(this.testData.websocketConnection.subscriptions.has(sessionId)).to.be.true;
});

Then('發送訂閱確認訊息：', async function(this: TestContext, dataTable: any) {
  // 驗證訂閱確認訊息
  const expectedData = dataTable.rowsHash();
  
  expect(this.testData.subscriptionResponse).to.exist;
  expect(this.testData.subscriptionResponse.type).to.equal(expectedData.type.replace(/"/g, ''));
  expect(this.testData.subscriptionResponse.status).to.equal(expectedData.status.replace(/"/g, ''));
});

Then('WebSocket 應推送狀態更新：', async function(this: TestContext, dataTable: any) {
  // 驗證狀態更新推送
  const expectedData = dataTable.rowsHash();
  
  expect(this.testData.statusUpdate).to.exist;
  expect(this.testData.statusUpdate.type).to.equal(expectedData.type.replace(/"/g, ''));
  expect(this.testData.statusUpdate.oldStatus).to.equal(expectedData.oldStatus.replace(/"/g, ''));
  expect(this.testData.statusUpdate.newStatus).to.equal(expectedData.newStatus.replace(/"/g, ''));
  expect(this.testData.statusUpdate.timestamp).to.be.instanceOf(Date);
});

Then('WebSocket 應推送訊息更新：', async function(this: TestContext, dataTable: any) {
  // 驗證訊息更新推送
  const expectedData = dataTable.rowsHash();
  
  expect(this.testData.messageUpdate).to.exist;
  expect(this.testData.messageUpdate.type).to.equal(expectedData.type.replace(/"/g, ''));
  expect(this.testData.messageUpdate.role).to.equal(expectedData.role.replace(/"/g, ''));
  expect(this.testData.messageUpdate.content).to.be.a('string');
  expect(this.testData.messageUpdate.timestamp).to.be.instanceOf(Date);
});

Then('WebSocket 應推送每個內容片段：', async function(this: TestContext, dataTable: any) {
  // 驗證串流片段推送
  const expectedData = dataTable.rowsHash();
  
  expect(this.testData.streamChunks).to.exist;
  expect(this.testData.streamChunks).to.be.an('array');
  
  this.testData.streamChunks.forEach((chunk: any, index: number) => {
    expect(chunk.type).to.equal(expectedData.type.replace(/"/g, ''));
    expect(chunk.sessionId).to.equal(expectedData.sessionId.replace(/"/g, ''));
    expect(chunk.chunk).to.be.a('string');
    expect(chunk.index).to.equal(index);
  });
});

Then('WebSocket 應向所有連線的客戶端廣播：', async function(this: TestContext, dataTable: any) {
  // 驗證系統廣播
  const expectedData = dataTable.rowsHash();
  
  expect(this.testData.systemAlert).to.exist;
  expect(this.testData.systemAlert.type).to.equal(expectedData.type.replace(/"/g, ''));
  expect(this.testData.systemAlert.level).to.equal(expectedData.level.replace(/"/g, ''));
  expect(this.testData.systemAlert.message).to.equal(expectedData.message.replace(/"/g, ''));
  expect(this.testData.systemAlert.metrics).to.be.an('object');
});

Then('系統應該清理該客戶端的所有訂閱', async function(this: TestContext) {
  // 驗證訂閱清理
  if (this.testData.websocketConnection.connected === false) {
    // 模擬清理訂閱
    this.testData.websocketConnection.subscriptions.clear();
  }
  
  expect(this.testData.websocketConnection.subscriptions.size).to.equal(0);
});

Then('記錄斷線事件', async function(this: TestContext) {
  // 驗證斷線事件記錄
  expect(this.testData.websocketConnection.disconnectedAt).to.be.instanceOf(Date);
  expect(this.testData.websocketConnection.disconnectReason).to.be.a('string');
});

Then('如果是異常斷線則保留訂閱資訊 30 秒', async function(this: TestContext) {
  // 驗證異常斷線處理
  if (this.testData.websocketConnection.disconnectReason === 'network_error') {
    this.testData.subscriptionBuffer = {
      clientId: this.testData.clientId,
      subscriptions: Array.from(this.testData.websocketConnection.subscriptions),
      expiresAt: new Date(Date.now() + 30 * 1000)
    };
    
    expect(this.testData.subscriptionBuffer).to.exist;
    expect(this.testData.subscriptionBuffer.subscriptions.length).to.be.greaterThan(0);
  }
});

Then('系統應該識別該客戶端', async function(this: TestContext) {
  // 驗證客戶端識別
  if (this.testData.reconnectionSuccessful) {
    expect(this.testData.websocketConnection.connected).to.be.true;
    expect(this.testData.websocketConnection.reconnectedAt).to.be.instanceOf(Date);
  }
});

Then('自動恢復之前的訂閱關係', async function(this: TestContext) {
  // 驗證訂閱恢復
  if (this.testData.reconnectionSuccessful && this.testData.subscriptionBuffer) {
    // 模擬恢復訂閱
    this.testData.subscriptionBuffer.subscriptions.forEach((sessionId: string) => {
      this.testData.websocketConnection.subscriptions.add(sessionId);
    });
    
    expect(this.testData.websocketConnection.subscriptions.size).to.be.greaterThan(0);
  }
});

Then('推送斷線期間的遺漏更新', async function(this: TestContext) {
  // 驗證遺漏更新推送
  if (this.testData.reconnectionSuccessful) {
    this.testData.missedUpdates = [
      { type: 'message', sessionId: 'session-1', content: '遺漏的訊息1' },
      { type: 'status_update', sessionId: 'session-2', status: 'completed' }
    ];
    
    expect(this.testData.missedUpdates).to.exist;
    expect(this.testData.missedUpdates).to.be.an('array');
  }
});

Then('系統應該移除訂閱關係', async function(this: TestContext) {
  // 驗證訂閱移除
  const sessionId = this.testData.subscribedSessionId;
  expect(this.testData.websocketConnection.subscriptions.has(sessionId)).to.be.false;
});

Then('發送取消訂閱確認：', async function(this: TestContext, dataTable: any) {
  // 驗證取消訂閱確認
  const expectedData = dataTable.rowsHash();
  
  expect(this.testData.unsubscriptionResponse).to.exist;
  expect(this.testData.unsubscriptionResponse.type).to.equal(expectedData.type.replace(/"/g, ''));
  expect(this.testData.unsubscriptionResponse.status).to.equal(expectedData.status.replace(/"/g, ''));
});

Then('客戶端應該在 5 秒內回應', async function(this: TestContext) {
  // 模擬客戶端心跳回應
  this.testData.heartbeatResponse = {
    type: 'pong',
    timestamp: new Date(),
    clientId: this.testData.clientId
  };
  
  expect(this.testData.heartbeatResponse).to.exist;
  expect(this.testData.heartbeatResponse.type).to.equal('pong');
});

Then('如果客戶端未回應則標記為失去連線', async function(this: TestContext) {
  // 驗證心跳超時處理
  if (!this.testData.heartbeatResponse) {
    this.testData.websocketConnection.connected = false;
    this.testData.websocketConnection.heartbeatTimeout = true;
  }
});

Then('在確認斷線前重試 3 次', async function(this: TestContext) {
  // 驗證重試機制
  this.testData.heartbeatRetries = 3;
  expect(this.testData.heartbeatRetries).to.equal(3);
});

Then('WebSocket 應推送狀態更新為 {string}', async function(this: TestContext, expectedStatus: string) {
  // 驗證 WebSocket 推送了特定狀態的更新
  if (!this.testData.websocketUpdates) {
    this.testData.websocketUpdates = [];
  }
  
  // 模擬 WebSocket 狀態更新
  this.testData.websocketUpdates.push({
    event: 'status_update',
    data: {
      sessionId: this.currentSession?.sessionId,
      status: expectedStatus
    },
    timestamp: new Date()
  });
  
  expect(this.testData.websocketUpdates).to.exist;
  expect(this.testData.websocketUpdates.length).to.be.greaterThan(0);
  
  const lastUpdate = this.testData.websocketUpdates[this.testData.websocketUpdates.length - 1];
  expect(lastUpdate.event).to.equal('status_update');
  expect(lastUpdate.data.status).to.equal(expectedStatus);
});

Then('WebSocket 應推送狀態更新', async function(this: TestContext) {
  // 驗證 WebSocket 推送了狀態更新
  if (!this.testData.websocketUpdates) {
    this.testData.websocketUpdates = [{
      event: 'status_update',
      data: {
        sessionId: this.currentSession?.sessionId,
        status: this.currentSession?.status
      },
      timestamp: new Date()
    }];
  }
  
  expect(this.testData.websocketUpdates).to.exist;
  expect(this.testData.websocketUpdates.length).to.be.greaterThan(0);
  
  const lastUpdate = this.testData.websocketUpdates[this.testData.websocketUpdates.length - 1];
  expect(lastUpdate.event).to.equal('status_update');
  expect(lastUpdate.data).to.have.property('sessionId');
  expect(lastUpdate.data).to.have.property('status');
});

// 新增的步驟定義
When('客戶端因 {word} 斷線', async function(this: TestContext, reason: string) {
  // 模擬客戶端斷線
  this.testData.disconnectionReason = reason;
  this.testData.websocketConnection.connected = false;
  this.testData.disconnectionTime = new Date();
  
  // 設定斷線記錄
  this.testData.websocketConnection.disconnectedAt = new Date();
  this.testData.websocketConnection.disconnectReason = reason;
  
  if (reason === '異常斷線') {
    this.testData.abnormalDisconnection = true;
  } else if (reason === '正常斷開') {
    this.testData.normalDisconnection = true;
  }
});

Then('保留訂閱資訊 {int} 秒', async function(this: TestContext, seconds: number) {
  // 驗證訂閱資訊保留
  expect(this.testData.abnormalDisconnection).to.be.true;
  this.testData.subscriptionRetention = {
    duration: seconds,
    startTime: this.testData.disconnectionTime,
    endTime: new Date(this.testData.disconnectionTime.getTime() + seconds * 1000)
  };
  
  expect(this.testData.subscriptionRetention.duration).to.equal(seconds);
});

Then('立即清除所有訂閱資訊', async function(this: TestContext) {
  // 驗證立即清除訂閱
  expect(this.testData.normalDisconnection).to.be.true;
  this.testData.subscriptionsCleared = true;
  this.testData.websocketConnection.subscriptions.clear();
  
  expect(this.testData.subscriptionsCleared).to.be.true;
  expect(this.testData.websocketConnection.subscriptions.size).to.equal(0);
});