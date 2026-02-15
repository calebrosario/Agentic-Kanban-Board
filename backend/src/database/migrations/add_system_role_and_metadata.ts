import { Database } from '../database';

export async function addSystemRoleAndMetadata() {
  const db = Database.getInstance();
  
  // SQLite 不支援直接修改 CHECK 約束，需要重建表
  await db.run(`
    -- 1. 建立新的暫時表，包含 system role 和 metadata
    CREATE TABLE IF NOT EXISTS messages_new (
      message_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      compressed BOOLEAN DEFAULT FALSE,
      original_size INTEGER,
      compressed_size INTEGER,
      metadata TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );
  `);
  
  // 2. 複製舊資料到新表
  await db.run(`
    INSERT INTO messages_new (message_id, session_id, role, content, compressed, original_size, compressed_size, timestamp)
    SELECT message_id, session_id, role, content, compressed, original_size, compressed_size, timestamp
    FROM messages;
  `);
  
  // 3. 刪除舊表
  await db.run(`DROP TABLE messages;`);
  
  // 4. 重新命名新表
  await db.run(`ALTER TABLE messages_new RENAME TO messages;`);
  
  // 5. 重建索引
  await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);`);
  
  console.log('Migration completed: Added system role and metadata to messages table');
}

// 執行 migration
if (require.main === module) {
  addSystemRoleAndMetadata()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}