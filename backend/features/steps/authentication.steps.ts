import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { TestContext } from './world';
import axios from 'axios';
import jwt from 'jsonwebtoken';

// 認證相關的步驟定義

When('使用者使用正確的帳號密碼登入：', async function(this: TestContext, dataTable: any) {
  const credentials = dataTable.rowsHash();
  
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      username: credentials.username,
      password: credentials.password
    });
    
    this.responseStatus = response.status;
    this.responseBody = response.data;
    
    // 保存 token 供後續測試使用
    if (response.data.token) {
      this.testData.authToken = response.data.token;
    }
  } catch (error: any) {
    this.responseStatus = error.response?.status || 500;
    this.responseBody = error.response?.data || {};
  }
});

When('使用者嘗試登入：', async function(this: TestContext, dataTable: any) {
  const credentials = dataTable.rowsHash();
  
  try {
    const response = await axios.post('http://localhost:3001/api/auth/login', {
      username: credentials.username || '',
      password: credentials.password || ''
    });
    
    this.responseStatus = response.status;
    this.responseBody = response.data;
  } catch (error: any) {
    this.responseStatus = error.response?.status || 500;
    this.responseBody = error.response?.data || {};
  }
});

Given('使用者已經成功登入並獲得 token', async function(this: TestContext) {
  const response = await axios.post('http://localhost:3001/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  
  expect(response.status).to.equal(200);
  expect(response.data.token).to.exist;
  
  this.testData.authToken = response.data.token;
});

When('使用者使用該 token 驗證身份', async function(this: TestContext) {
  try {
    const response = await axios.get('http://localhost:3001/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${this.testData.authToken}`
      }
    });
    
    this.responseStatus = response.status;
    this.responseBody = response.data;
  } catch (error: any) {
    this.responseStatus = error.response?.status || 500;
    this.responseBody = error.response?.data || {};
  }
});

When('使用者使用無效的 token 驗證身份', async function(this: TestContext) {
  try {
    const response = await axios.get('http://localhost:3001/api/auth/verify', {
      headers: {
        Authorization: 'Bearer invalid-token-12345'
      }
    });
    
    this.responseStatus = response.status;
    this.responseBody = response.data;
  } catch (error: any) {
    this.responseStatus = error.response?.status || 500;
    this.responseBody = error.response?.data || {};
  }
});

When('使用者在沒有 token 的情況下嘗試驗證身份', async function(this: TestContext) {
  try {
    const response = await axios.get('http://localhost:3001/api/auth/verify');
    
    this.responseStatus = response.status;
    this.responseBody = response.data;
  } catch (error: any) {
    this.responseStatus = error.response?.status || 500;
    this.responseBody = error.response?.data || {};
  }
});

Given('使用者有一個有效的 token', async function(this: TestContext) {
  // 生成一個有效的 token
  const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key';
  this.testData.authToken = jwt.sign(
    { username: 'admin', timestamp: Date.now() },
    jwtSecret,
    { expiresIn: '7d' }
  );
});

When('使用者攜帶 token 存取受保護的 API', async function(this: TestContext) {
  // 測試一個受保護的端點（例如：獲取所有 sessions）
  try {
    const response = await axios.get('http://localhost:3001/api/sessions', {
      headers: {
        Authorization: `Bearer ${this.testData.authToken}`
      }
    });
    
    this.responseStatus = response.status;
    this.responseBody = response.data;
    // 只有成功時才設定這個標記
    if (response.status === 200) {
      this.testData.protectedApiAccessed = true;
    }
  } catch (error: any) {
    console.log('Protected API error:', error.response?.status, error.response?.data);
    this.responseStatus = error.response?.status || 500;
    this.responseBody = error.response?.data || {};
    this.testData.protectedApiAccessed = false;
  }
});

When('使用者在沒有 token 的情況下存取受保護的 API', async function(this: TestContext) {
  try {
    const response = await axios.get('http://localhost:3001/api/sessions');
    
    this.responseStatus = response.status;
    this.responseBody = response.data;
  } catch (error: any) {
    this.responseStatus = error.response?.status || 500;
    this.responseBody = error.response?.data || {};
  }
});

Given('使用者有一個已過期的 token', async function(this: TestContext) {
  // 生成一個已過期的 token
  const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key';
  this.testData.authToken = jwt.sign(
    { username: 'admin', timestamp: Date.now() },
    jwtSecret,
    { expiresIn: '-1h' } // 已過期 1 小時
  );
});

When('使用者攜帶過期 token 存取受保護的 API', async function(this: TestContext) {
  try {
    const response = await axios.get('http://localhost:3001/api/sessions', {
      headers: {
        Authorization: `Bearer ${this.testData.authToken}`
      }
    });
    
    this.responseStatus = response.status;
    this.responseBody = response.data;
  } catch (error: any) {
    this.responseStatus = error.response?.status || 500;
    this.responseBody = error.response?.data || {};
  }
});

// Then 步驟

Then('response 應包含 success 為 {word}', async function(this: TestContext, value: string) {
  const expectedValue = value === 'true';
  expect(this.responseBody.success).to.equal(expectedValue);
});

// Removed - using generic step from common.steps.ts instead

// Removed - using generic step from common.steps.ts instead

Then('response 應包含 message {string}', async function(this: TestContext, expectedMessage: string) {
  expect(this.responseBody.message).to.equal(expectedMessage);
});

Then('response 應包含 decoded 資訊', async function(this: TestContext) {
  expect(this.responseBody.decoded).to.exist;
  expect(this.responseBody.decoded.username).to.exist;
  expect(this.responseBody.decoded.timestamp).to.exist;
});

Then('請求應該被允許通過', async function(this: TestContext) {
  expect(this.testData.protectedApiAccessed).to.be.true;
  // 如果是受保護的 API，成功的狀態碼應該是 200
  expect(this.responseStatus).to.be.lessThan(400);
});

Then('使用者資訊應該被附加到請求物件', async function(this: TestContext) {
  // 這個驗證通常在中間件內部發生
  // 我們透過成功存取受保護的 API 來間接驗證
  expect(this.testData.protectedApiAccessed).to.be.true;
});