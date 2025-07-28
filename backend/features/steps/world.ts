import { World, setWorldConstructor } from '@cucumber/cucumber';
import { Session, SessionStatus } from '../../src/types/session.types';

export interface TestContext extends World {
  // API 相關
  baseUrl: string;
  response?: any;
  responseStatus?: number;
  responseBody?: any;
  responseHeaders?: any;
  requestOptions?: any;
  
  // Session 相關
  currentSession?: Session;
  sessions: Map<string, Session>;
  
  // Process 相關
  mockProcesses: Map<string, any>;
  
  // 測試資料
  testData: any;
  
  // 斷言工具
  assert: any;
  
  // 方法
  cleanup(): Promise<void>;
  makeRequest(method: string, path: string, data?: any): Promise<any>;
  redactSensitiveInfo(content: string): string;
}

class CustomWorld extends World implements TestContext {
  baseUrl: string = 'http://localhost:3000';
  response?: any;
  responseStatus?: number;
  responseBody?: any;
  responseHeaders?: any;
  requestOptions: any = {
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  currentSession?: Session;
  sessions: Map<string, Session> = new Map();
  
  mockProcesses: Map<string, any> = new Map();
  
  testData: any = {};
  
  assert = require('assert');
  
  constructor(options: any) {
    super(options);
  }
  
  // 清理函數
  async cleanup() {
    this.sessions.clear();
    this.mockProcesses.clear();
    this.testData = {};
    this.currentSession = undefined;
    this.response = undefined;
    this.responseStatus = undefined;
    this.responseBody = undefined;
    this.responseHeaders = undefined;
    this.requestOptions = {
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  async makeRequest(method: string, path: string, data?: any): Promise<any> {
    // 模擬 HTTP 請求
    // 在實際測試中，這裡會使用真正的 HTTP 客戶端如 axios
    return {
      status: 200,
      data: data || {},
      headers: {}
    };
  }

  redactSensitiveInfo(content: string): string {
    const sensitivePatterns = [
      /\b[A-Za-z0-9]{32,}\b/g,  // API 金鑰模式
      /password\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
      /token\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
      /api_key\s*[:=]\s*["']?([^"'\s]+)["']?/gi,
      /secret\s*[:=]\s*["']?([^"'\s]+)["']?/gi
    ];

    let redacted = content;
    sensitivePatterns.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });

    return redacted;
  }
}

setWorldConstructor(CustomWorld);