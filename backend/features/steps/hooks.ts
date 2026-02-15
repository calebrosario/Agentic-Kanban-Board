import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';
import { TestContext } from './world';
import { Database } from '../../src/database/database';

// 全域設定
BeforeAll(async function() {
  console.log('Starting test suite...');
  
  // 初始化測試資料庫
  const db = Database.getInstance();
  await db.initialize();
  console.log('Test database initialized');
});

AfterAll(async function() {
  console.log('Test suite completed.');
  
  // 關閉資料庫連線
  const db = Database.getInstance();
  await db.close();
  console.log('Test database closed');
});

// 每個 Scenario 前的設定
Before(async function(this: TestContext) {
  await this.cleanup();
  
  // 清理測試資料庫數據
  const db = Database.getInstance();
  await db.run('DELETE FROM messages');
  await db.run('DELETE FROM session_status_history');
  await db.run('DELETE FROM sessions');
});

// 每個 Scenario 後的清理
After(async function(this: TestContext) {
  // 清理測試產生的資料
  for (const [sessionId, session] of this.sessions) {
    // 這裡會清理實際的進程等資源
    console.log(`Cleaning up session: ${sessionId}`);
  }
  
  await this.cleanup();
});