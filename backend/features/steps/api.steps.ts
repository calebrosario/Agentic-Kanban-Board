import { When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './world';

// 原子化的 API 相關 Steps

When('使用者查詢所有 Sessions', async function(this: TestContext) {
  try {
    // 模擬 API 呼叫
    const sessions = Array.from(this.sessions.values());
    this.responseStatus = 200;
    this.responseBody = sessions;
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

When('使用者查詢該 Session 的詳細資訊', async function(this: TestContext) {
  try {
    const sessionId = this.currentSession?.sessionId || this.testData.nonExistentSessionId;
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    this.responseStatus = 200;
    this.responseBody = session;
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

When('使用者標記該 Session 為完成', async function(this: TestContext) {
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    // 檢查狀態是否允許完成
    if (this.currentSession.status !== 'idle' && this.currentSession.status !== 'error') {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: 'Session must be idle or in error state to complete' };
    }
    
    this.currentSession.status = SessionStatus.COMPLETED;
    this.currentSession.completedAt = new Date();
    this.currentSession.error = null; // 完成時清除錯誤訊息
    this.currentSession.updatedAt = new Date();
    
    this.responseStatus = 200;
    this.responseBody = this.currentSession;
    
    // 模擬終止進程
    if (this.currentSession.processId) {
      this.mockProcesses.delete(this.currentSession.processId.toString());
    }
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

When('使用者嘗試標記該 Session 為完成', async function(this: TestContext) {
  // 這個步驟和上面的一樣，但明確表示這是一個可能失敗的嘗試
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    // 檢查狀態是否允許完成
    if (this.currentSession.status !== 'idle' && this.currentSession.status !== 'error') {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: 'Session must be idle or in error state to complete' };
    }
    
    this.currentSession.status = SessionStatus.COMPLETED;
    this.currentSession.completedAt = new Date();
    this.currentSession.error = null;
    this.currentSession.updatedAt = new Date();
    
    this.responseStatus = 200;
    this.responseBody = this.currentSession;
    
    if (this.currentSession.processId) {
      this.mockProcesses.delete(this.currentSession.processId.toString());
    }
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

When('使用者刪除該 Session', async function(this: TestContext) {
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    // 檢查 Session 是否在處理中
    if (this.currentSession.status === SessionStatus.PROCESSING) {
      throw { statusCode: 400, code: 'SESSION_STILL_PROCESSING', message: 'Cannot delete a session that is currently processing' };
    }
    
    // 在刪除前設定軟刪除操作（用於 persistence feature）
    if (!this.testData.persistenceOperation) {
      this.testData.persistenceOperation = {
        action: 'soft_delete',
        table: 'sessions',
        data: {
          sessionId: this.currentSession.sessionId,
          deletedAt: new Date()
        },
        executed: true,
        timestamp: new Date()
      };
    }
    
    this.sessions.delete(this.currentSession.sessionId);
    this.responseStatus = 204;
    this.responseBody = null;
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

When('使用者嘗試刪除該 Session', async function(this: TestContext) {
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    if (this.currentSession.status === SessionStatus.PROCESSING) {
      throw { statusCode: 400, code: 'SESSION_STILL_PROCESSING', message: 'Cannot delete a session that is currently processing' };
    }
    
    this.sessions.delete(this.currentSession.sessionId);
    this.responseStatus = 204;
    this.responseBody = null;
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

When('使用者發送訊息 {string}', async function(this: TestContext, message: string) {
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    if (this.currentSession.status !== SessionStatus.IDLE) {
      throw { statusCode: 400, code: 'SESSION_NOT_ACTIVE', message: 'Session is not active' };
    }
    
    const messageId = uuidv4();
    
    // 更新 session 狀態和清除錯誤
    this.currentSession.status = SessionStatus.PROCESSING;
    this.currentSession.error = null; // 清除舊的錯誤訊息
    this.currentSession.updatedAt = new Date();
    
    this.responseStatus = 200;
    this.responseBody = {
      messageId: messageId,
      timestamp: new Date()
    };
    
    // 模擬傳送訊息到進程
    this.testData.lastMessage = {
      id: messageId,
      content: message,
      timestamp: new Date()
    };
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

When('使用者嘗試發送訊息', async function(this: TestContext) {
  // 使用預設訊息
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    if (this.currentSession.status !== SessionStatus.IDLE) {
      throw { statusCode: 400, code: 'SESSION_NOT_ACTIVE', message: 'Session is not active' };
    }
    
    const messageId = uuidv4();
    
    // 更新 session 狀態和清除錯誤
    this.currentSession.status = SessionStatus.PROCESSING;
    this.currentSession.error = null; // 清除舊的錯誤訊息
    this.currentSession.updatedAt = new Date();
    
    this.responseStatus = 200;
    this.responseBody = {
      messageId: messageId,
      timestamp: new Date()
    };
    
    // 模擬傳送訊息到進程
    this.testData.lastMessage = {
      id: messageId,
      content: 'Test message',
      timestamp: new Date()
    };
  } catch (error: any) {
    this.responseStatus = error.statusCode || 500;
    this.responseBody = {
      error_code: error.code || 'INTERNAL_ERROR',
      error_message: error.message
    };
  }
});

When('使用者查詢對話歷史', async function(this: TestContext) {
  try {
    if (!this.currentSession) {
      throw { statusCode: 404, code: 'SESSION_NOT_FOUND', message: 'Session not found' };
    }
    
    const conversations = this.testData.conversations || [];
    this.responseStatus = 200;
    this.responseBody = {
      data: conversations,
      pagination: {
        total: conversations.length,
        page: 1,
        totalPages: 1
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

// 需要先 import SessionStatus
import { SessionStatus } from '../../src/types/session.types';
import { v4 as uuidv4 } from 'uuid';

// 驗證 Steps

Then('response 應包含 {int} 個 Sessions', async function(this: TestContext, count: number) {
  expect(this.responseBody).to.be.an('array');
  expect(this.responseBody).to.have.lengthOf(count);
});

Then('每個 Session 應包含以下資訊：', async function(this: TestContext, dataTable: any) {
  const expectedFields = dataTable.raw()[0];
  
  expect(this.responseBody).to.be.an('array');
  this.responseBody.forEach((session: any) => {
    expectedFields.forEach((field: string) => {
      expect(session).to.have.property(field.trim());
    });
  });
});

// 這些已經在 common.steps.ts 的 'response 應包含 {word}' 中處理了

// completedAt 也已經在 common.steps.ts 中處理了

Then('該 Session 應從系統中移除', async function(this: TestContext) {
  if (this.currentSession) {
    expect(this.sessions.has(this.currentSession.sessionId)).to.be.false;
  }
});

Then('相關的對話記錄應被清理', async function(this: TestContext) {
  // 驗證對話記錄已被清理
  expect(this.testData.conversationHistory).to.be.undefined;
});

Then('新 Session 應該載入上次的對話歷史', async function(this: TestContext) {
  // 驗證對話歷史已載入
  expect(this.testData.conversationHistory).to.exist;
  expect(this.testData.conversationHistory).to.have.length.greaterThan(0);
});

Then('Claude Code 進程應使用 -c 參數啟動', async function(this: TestContext) {
  // 驗證 -c 參數
  expect(this.currentSession?.continueChat).to.be.true;
});

Then('Claude Code 進程應使用 --dangerously-skip-permissions 參數啟動', async function(this: TestContext) {
  // 驗證 --dangerously-skip-permissions 參數
  expect(this.currentSession?.dangerouslySkipPermissions).to.be.true;
});

Then('系統應該終止該 Session 的 Claude Code 進程', async function(this: TestContext) {
  // 驗證進程已被終止
  if (this.currentSession?.processId) {
    expect(this.mockProcesses.has(this.currentSession.processId.toString())).to.be.false;
  }
});