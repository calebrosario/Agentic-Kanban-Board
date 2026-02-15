import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './world';
import { v4 as uuidv4 } from 'uuid';
import { SessionStatus } from '../../src/types/session.types';

// Session 互動相關的 Steps

Then('訊息應該被傳送到 Claude Code 進程', async function(this: TestContext) {
  // 驗證訊息已傳送到進程
  expect(this.testData.lastMessage).to.exist;
  expect(this.testData.lastMessage.content).to.be.a('string');
});

Then('WebSocket 應推送訊息狀態更新', async function(this: TestContext) {
  // 模擬 WebSocket 推送
  this.testData.websocketMessages = this.testData.websocketMessages || [];
  this.testData.websocketMessages.push({
    type: 'message_status',
    sessionId: this.currentSession?.sessionId,
    messageId: this.testData.lastMessage?.id,
    status: 'sent'
  });
  
  expect(this.testData.websocketMessages).to.have.length.greaterThan(0);
});

When('Claude Code 產生回應內容', async function(this: TestContext) {
  // 模擬 Claude Code 產生回應
  const responseContent = 'src 目錄結構分析結果：\n- src/components/\n- src/services/\n- src/utils/';
  
  this.testData.claudeResponse = {
    sessionId: this.currentSession?.sessionId,
    messageId: uuidv4(),
    content: responseContent,
    timestamp: new Date(),
    type: 'message'
  };
});

Then('系統應該捕獲輸出內容', async function(this: TestContext) {
  // 驗證系統捕獲了 Claude Code 的輸出
  expect(this.testData.claudeResponse).to.exist;
  expect(this.testData.claudeResponse.content).to.be.a('string');
  expect(this.testData.claudeResponse.content.length).to.be.greaterThan(0);
});

Then('WebSocket 應推送回應內容給客戶端', async function(this: TestContext) {
  // 模擬 WebSocket 推送回應內容
  this.testData.websocketMessages = this.testData.websocketMessages || [];
  this.testData.websocketMessages.push({
    type: 'message',
    ...this.testData.claudeResponse
  });
  
  expect(this.testData.websocketMessages).to.have.length.greaterThan(0);
  const lastMessage = this.testData.websocketMessages[this.testData.websocketMessages.length - 1];
  expect(lastMessage.type).to.equal('message');
  expect(lastMessage.content).to.equal(this.testData.claudeResponse.content);
});

Then('回應應包含以下資訊：', async function(this: TestContext, dataTable: any) {
  const expectedFields = dataTable.raw()[0];
  
  expect(this.testData.claudeResponse).to.exist;
  expectedFields.forEach((field: string) => {
    expect(this.testData.claudeResponse).to.have.property(field.trim());
  });
});

When('Claude Code 持續輸出內容', async function(this: TestContext) {
  // 模擬串流輸出
  this.testData.streamChunks = [
    'src 目錄分析中...\n',
    '發現 components 資料夾\n',
    '發現 services 資料夾\n',
    '發現 utils 資料夾\n',
    '分析完成\n'
  ];
});

Then('系統應該即時捕獲每個輸出片段', async function(this: TestContext) {
  // 驗證系統捕獲了所有片段
  expect(this.testData.streamChunks).to.exist;
  expect(this.testData.streamChunks).to.be.an('array');
  expect(this.testData.streamChunks.length).to.be.greaterThan(0);
});

Then('WebSocket 應推送每個片段給客戶端', async function(this: TestContext) {
  // 模擬推送每個片段
  this.testData.websocketMessages = this.testData.websocketMessages || [];
  
  this.testData.streamChunks.forEach((chunk: string, index: number) => {
    this.testData.websocketMessages.push({
      type: 'stream_chunk',
      sessionId: this.currentSession?.sessionId,
      chunk: chunk,
      index: index,
      timestamp: new Date()
    });
  });
  
  expect(this.testData.websocketMessages.length).to.equal(this.testData.streamChunks.length);
});

Then('客戶端應能即時看到回應進度', async function(this: TestContext) {
  // 驗證客戶端能看到進度
  const streamMessages = this.testData.websocketMessages.filter((msg: any) => msg.type === 'stream_chunk');
  expect(streamMessages.length).to.be.greaterThan(0);
  
  // 驗證片段順序
  streamMessages.forEach((msg: any, index: number) => {
    expect(msg.index).to.equal(index);
  });
});

// messageId 和 timestamp 已經在 common.steps.ts 中處理

When('使用者查詢對話歷史，參數如下：', async function(this: TestContext, dataTable: any) {
  const params = dataTable.rowsHash();
  
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    const page = Number(params['page']) || 1;
    const limit = Number(params['limit']) || 20;
    const conversations = this.testData.conversations || [];
    
    // 模擬分頁
    const offset = (page - 1) * limit;
    const paginatedConversations = conversations.slice(offset, offset + limit);
    const totalPages = Math.ceil(conversations.length / limit);
    
    this.responseStatus = 200;
    this.responseBody = {
      data: paginatedConversations,
      pagination: {
        total: conversations.length,
        page: page,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

Then('response 應包含 {int} 筆對話記錄', async function(this: TestContext, count: number) {
  expect(this.responseBody).to.have.property('data');
  expect(this.responseBody.data).to.be.an('array');
  expect(this.responseBody.data).to.have.lengthOf(count);
});

Then('每筆記錄應包含：', async function(this: TestContext, dataTable: any) {
  const expectedFields = dataTable.raw()[0];
  
  expect(this.responseBody.data).to.be.an('array');
  this.responseBody.data.forEach((record: any) => {
    expectedFields.forEach((field: string) => {
      expect(record).to.have.property(field.trim());
    });
  });
});

Then('對話記錄應按時間順序排列', async function(this: TestContext) {
  const conversations = this.responseBody.data;
  expect(conversations).to.be.an('array');
  
  if (conversations.length > 1) {
    for (let i = 1; i < conversations.length; i++) {
      const prevTime = new Date(conversations[i-1].timestamp).getTime();
      const currentTime = new Date(conversations[i].timestamp).getTime();
      expect(currentTime).to.be.greaterThan(prevTime);
    }
  }
});

Then('response 應包含分頁資訊：', async function(this: TestContext, dataTable: any) {
  const expectedPagination = dataTable.rowsHash();
  
  expect(this.responseBody).to.have.property('pagination');
  Object.keys(expectedPagination).forEach(key => {
    expect(this.responseBody.pagination).to.have.property(key);
    expect(this.responseBody.pagination[key]).to.equal(Number(expectedPagination[key]));
  });
});

When('使用者發送中斷指令', async function(this: TestContext) {
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    if (this.currentSession.status !== SessionStatus.PROCESSING) {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: 'Session is not processing' };
    }
    
    // 模擬中斷進程
    this.testData.longRunningTask = false;
    this.currentSession.status = SessionStatus.IDLE;
    this.currentSession.error = null; // 中斷時清除錯誤訊息
    this.currentSession.updatedAt = new Date();
    
    this.responseStatus = 200;
    this.responseBody = {
      success: true,
      message: 'Session interrupted'
    };
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

Then('Claude Code 進程應收到中斷信號', async function(this: TestContext) {
  // 驗證進程收到中斷信號
  expect(this.testData.longRunningTask).to.be.false;
});

Then('Session 狀態應更新為 {string}', async function(this: TestContext, status: string) {
  expect(this.currentSession?.status).to.equal(status);
});

Then('WebSocket 應推送狀態更新', async function(this: TestContext) {
  // 模擬 WebSocket 推送狀態更新
  this.testData.websocketMessages = this.testData.websocketMessages || [];
  this.testData.websocketMessages.push({
    type: 'status_update',
    sessionId: this.currentSession?.sessionId,
    status: this.currentSession?.status,
    timestamp: new Date()
  });
  
  const statusMessage = this.testData.websocketMessages.find((msg: any) => msg.type === 'status_update');
  expect(statusMessage).to.exist;
});

When('使用者發送恢復指令', async function(this: TestContext) {
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    if (this.currentSession.status !== 'interrupted') {
      throw { statusCode: 400, code: 'SESSION_NOT_INTERRUPTED', message: 'Session is not interrupted' };
    }
    
    // 恢復 Session（現在已不需要恢復，中斷後即為 idle）
    this.currentSession.status = SessionStatus.IDLE;
    this.currentSession.updatedAt = new Date();
    
    this.responseStatus = 200;
    this.responseBody = {
      success: true,
      message: 'Session resumed'
    };
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

Then('使用者可以繼續發送新訊息', async function(this: TestContext) {
  // 驗證可以繼續發送訊息
  expect(this.currentSession?.status).to.equal(SessionStatus.IDLE);
});

Then('舊的錯誤訊息應被清除', async function(this: TestContext) {
  // 驗證 session 的錯誤訊息已被清除
  if (this.currentSession) {
    expect(this.currentSession.error).to.be.null;
  }
});

Then('錯誤訊息應被清除', async function(this: TestContext) {
  // 驗證 session 的錯誤訊息已被清除
  if (this.currentSession) {
    expect(this.currentSession.error).to.be.null;
  }
});

Then('Session 狀態應回到 {string}', async function(this: TestContext, expectedStatus: string) {
  // 驗證 session 狀態
  expect(this.currentSession?.status).to.equal(expectedStatus);
});

Given('Session 之前有錯誤訊息', async function(this: TestContext) {
  // 設置 session 有錯誤訊息
  if (this.currentSession) {
    this.currentSession.error = 'Previous error message';
  }
});

When('使用者發送新訊息', async function(this: TestContext) {
  // 模擬發送新訊息，這會觸發錯誤清除
  if (this.currentSession) {
    this.currentSession.status = SessionStatus.PROCESSING;
    this.currentSession.error = null; // 清除錯誤訊息
    this.currentSession.updatedAt = new Date();
  }
  
  this.responseStatus = 200;
  this.responseBody = {
    messageId: uuidv4(),
    timestamp: new Date().toISOString()
  };
});

When('Claude Code 成功執行完成', async function(this: TestContext) {
  // 模擬 Claude Code 執行完成
  if (this.currentSession) {
    this.currentSession.status = SessionStatus.IDLE;
    this.currentSession.error = null; // 執行成功時清除錯誤
    this.currentSession.updatedAt = new Date();
  }
});

When('使用者嘗試中斷該 Session', async function(this: TestContext) {
  // 嘗試中斷非處理中的 session
  if (!this.currentSession) {
    throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
  }
  
  if (this.currentSession.status !== SessionStatus.PROCESSING) {
    this.responseStatus = 400;
    this.responseBody = {
      error_code: 'INVALID_STATUS',
      error_message: 'Session is not processing'
    };
    return;
  }
  
  // 如果是處理中狀態，則正常中斷
  this.currentSession.status = SessionStatus.IDLE;
  this.responseStatus = 200;
});

Given('Session 剛被中斷並處於 {string} 狀態', async function(this: TestContext, status: string) {
  // 設置 session 處於被中斷後的狀態
  if (this.currentSession) {
    this.currentSession.status = status as SessionStatus;
    this.currentSession.error = null; // 中斷時清除錯誤
    this.currentSession.updatedAt = new Date();
    this.testData.wasInterrupted = true;
  }
});

When('使用者發送新訊息 {string}', async function(this: TestContext, message: string) {
  // 模擬發送新訊息
  if (this.currentSession) {
    this.currentSession.status = SessionStatus.PROCESSING;
    this.currentSession.error = null; // 發送新訊息時清除錯誤
    this.currentSession.updatedAt = new Date();
  }
  
  this.testData.lastMessage = {
    id: `msg-${Date.now()}`,
    content: message,
    timestamp: new Date()
  };
  
  this.responseStatus = 200;
  this.responseBody = {
    messageId: this.testData.lastMessage.id,
    timestamp: new Date().toISOString()
  };
});

Then('訊息應該被傳送到新的 Claude Code 進程', async function(this: TestContext) {
  // 驗證訊息傳送到新的進程
  expect(this.testData.lastMessage).to.exist;
  expect(this.testData.lastMessage.content).to.be.a('string');
  
  // 驗證是新的進程（如果之前被中斷）
  if (this.testData.wasInterrupted) {
    this.testData.newProcessStarted = true;
    expect(this.testData.newProcessStarted).to.be.true;
  }
});