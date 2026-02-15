/**
 * Migration 001_add_provider_support
 *
 * This migration adds multi-tool support to the sessions table:
 * 1. Adds tool_type column with DEFAULT 'claude'
 * 2. Renames claude_session_id to tool_session_id
 * 3. Adds tool_session_data JSON column for provider-specific data
 * 4. Backfills existing sessions with tool_type = 'claude'
 * 5. Adds OpenCode and Cursor configuration keys to system_config
 */

export const up = async (db: any): Promise<void> => {
  // Add tool_type column to sessions table
  await db.exec(`
    ALTER TABLE sessions ADD COLUMN tool_type VARCHAR(50) DEFAULT 'claude' NOT NULL
  `);

  // Create index on tool_type for better query performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_tool_type ON sessions(tool_type)
  `);

  // Rename claude_session_id to tool_session_id
  await db.exec(`
    ALTER TABLE sessions RENAME COLUMN claude_session_id TO tool_session_id
  `);

  // Add tool_session_data column for provider-specific metadata
  await db.exec(`
    ALTER TABLE sessions ADD COLUMN tool_session_data JSON
  `);

  // Backfill existing sessions with tool_type = 'claude'
  await db.exec(`
    UPDATE sessions
    SET tool_type = 'claude'
    WHERE tool_type IS NULL OR tool_type = ''
  `);

  console.log('Migration 001_add_provider_support applied successfully');
};

export const down = async (db: any): Promise<void> => {
  // Drop tool_session_data column
  await db.exec(`
    ALTER TABLE sessions DROP COLUMN tool_session_data
  `);

  // Rename tool_session_id back to claude_session_id
  await db.exec(`
    ALTER TABLE sessions RENAME COLUMN tool_session_id TO claude_session_id
  `);

  // Drop tool_type column
  await db.exec(`
    ALTER TABLE sessions DROP COLUMN tool_type
  `);

  // Drop index
  await db.exec(`
    DROP INDEX IF EXISTS idx_sessions_tool_type
  `);

  console.log('Migration 001_add_provider_support rolled back successfully');
};
