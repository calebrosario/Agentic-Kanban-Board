/**
 * Migration 002_add_beads_support
 *
 * This migration adds beads integration support to sessions table:
 * 1. Adds uses_beads column to track if a session uses beads task management
 * 2. Creates index on uses_beads for filtering beads-enabled sessions
 */

export const up = async (db: any): Promise<void> => {
  // Add uses_beads column to sessions table
  await db.exec(`
    ALTER TABLE sessions ADD COLUMN uses_beads BOOLEAN DEFAULT FALSE
  `);

  // Create index on uses_beads for better query performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_uses_beads ON sessions(uses_beads)
  `);

  console.log('Migration 002_add_beads_support applied successfully');
};

export const down = async (db: any): Promise<void> => {
  // Drop index
  await db.exec(`
    DROP INDEX IF EXISTS idx_sessions_uses_beads
  `);

  // Drop uses_beads column
  await db.exec(`
    ALTER TABLE sessions DROP COLUMN uses_beads
  `);

  console.log('Migration 002_add_beads_support rolled back successfully');
};
