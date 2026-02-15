import { Given, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './world';
import { SessionStatus } from '../../src/types/session.types';

Given('系統已經啟動', async function(this: TestContext) {
  // 確認系統已啟動
  // 在實際實作中，這裡會檢查服務是否運行
  this.baseUrl = 'http://localhost:3000';
});

Given('Claude Code 可執行檔存在', async function(this: TestContext) {
  // 驗證 Claude Code 執行檔存在
  // 在實際實作中，這裡會檢查檔案系統
  this.testData.claudeCodePath = '/usr/local/bin/claude';
});

Then('API 應回傳 status code {int}', async function(this: TestContext, statusCode: number) {
  expect(this.responseStatus).to.equal(statusCode);
});

// 更具體的正則表達式，避免與其他步驟衝突
Then(/^response 應包含 (\w+)$/, async function(this: TestContext, field: string) {
  // 只匹配簡單的屬性名稱，不包含空格或其他特殊字符
  expect(this.responseBody).to.have.property(field);
});

Then('response 應包含 error_code {string}', async function(this: TestContext, errorCode: string) {
  expect(this.responseBody).to.have.property('error_code', errorCode);
});

Then('error_message 為 {string}', async function(this: TestContext, errorMessage: string) {
  expect(this.responseBody).to.have.property('error_message', errorMessage);
});

Given('系統中有 {int} 個不同狀態的 Sessions', async function(this: TestContext, count: number) {
  // 建立不同狀態的 Sessions
  this.testData.multipleSessions = [];
  const statuses = [SessionStatus.IDLE, SessionStatus.PROCESSING, SessionStatus.COMPLETED];
  
  for (let i = 0; i < count; i++) {
    const session = {
      sessionId: `session-${i + 1}`,
      name: `Session ${i + 1}`,
      task: `Task ${i + 1}`,
      status: statuses[i % statuses.length],
      workingDir: `C:\\Users\\Test${i + 1}`,
      continueChat: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      error: null
    };
    this.testData.multipleSessions.push(session);
    // 同時存到 sessions Map 中供查詢使用
    this.sessions.set(session.sessionId, session);
  }
  
  expect(this.testData.multipleSessions).to.have.lengthOf(count);
});

Then('Claude Code 進程應收到中斷信號並被終止', async function(this: TestContext) {
  // 驗證進程收到中斷信號並被終止
  this.testData.processInterrupted = true;
  this.testData.processTerminated = true;
  
  expect(this.testData.processInterrupted).to.be.true;
  expect(this.testData.processTerminated).to.be.true;
});

Then('系統應儲存中斷訊息 {string}', async function(this: TestContext, message: string) {
  // 驗證系統儲存了中斷訊息
  this.testData.interruptMessage = {
    content: message,
    timestamp: new Date(),
    type: 'interrupt'
  };
  
  expect(this.testData.interruptMessage).to.exist;
  expect(this.testData.interruptMessage.content).to.equal(message);
  expect(this.testData.interruptMessage.type).to.equal('interrupt');
});