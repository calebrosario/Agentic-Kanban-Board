-- Migration: Update session status values from old to new naming
-- Date: 2025-01-23
-- Description: Change 'initializing' to 'processing' and 'running' to 'idle'

-- Update sessions table
UPDATE sessions 
SET status = 'processing' 
WHERE status = 'initializing';

UPDATE sessions 
SET status = 'idle' 
WHERE status = 'running';

-- Add comment to document the change
-- Status values:
-- - processing: Session is actively executing a Claude command
-- - idle: Session is waiting for new commands
-- - completed: Session has finished and cannot accept new commands
-- - error: Session encountered an error
-- - interrupted: Session was interrupted by user
-- - crashed: Session crashed unexpectedly