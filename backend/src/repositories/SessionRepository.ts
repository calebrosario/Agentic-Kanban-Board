import { Session, SessionStatus } from '../types/session.types';
import { ToolType } from '../types/provider.types';
import { Database } from '../database/database';

interface SessionRow {
  session_id: string;
  name: string;
  working_dir: string;
  task: string;
  status: string;
  continue_chat: number;
  previous_session_id?: string;
  tool_session_id?: string;
  process_id?: number;
  dangerously_skip_permissions?: number;
  last_user_message?: string;
  message_count?: number;
  sort_order?: number;
  uses_beads?: number;
  workflow_stage_id?: string;
  work_item_id?: string;
  error?: string;
  provider?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  deleted_at?: string;
}

export class SessionRepository {
  private db: Database;
  
  constructor() {
    this.db = Database.getInstance();
  }
  
  private mapRowToSession(row: SessionRow): Session {
    return {
      sessionId: row.session_id,
      name: row.name,
      workingDir: row.working_dir,
      task: row.task,
      status: row.status as SessionStatus,
      continueChat: Boolean(row.continue_chat),
      previousSessionId: row.previous_session_id,
      toolSessionId: row.tool_session_id,
      processId: row.process_id,
      dangerouslySkipPermissions: Boolean(row.dangerously_skip_permissions),
      lastUserMessage: row.last_user_message,
      messageCount: row.message_count || 0,
      sortOrder: row.sort_order,
      usesBeads: Boolean(row.uses_beads),
      workflow_stage_id: row.workflow_stage_id,
      work_item_id: row.work_item_id,
      error: row.error,
      provider: row.provider as ToolType,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined
    };
  }
  
  private mapSessionToRow(session: Session): any[] {
    return [
      session.sessionId,
      session.name,
      session.workingDir,
      session.task,
      session.status,
      session.continueChat ? 1 : 0,
      session.previousSessionId,
      session.toolSessionId,
      session.processId,
      session.dangerouslySkipPermissions ?1 : 0,
      session.lastUserMessage,
      session.messageCount || 0,
      session.sortOrder,
      session.usesBeads ? 1 : 0,
      session.workflow_stage_id,
      session.work_item_id,
      session.error,
      session.provider || ToolType.CLAUDE,
      session.createdAt.toISOString(),
      session.updatedAt.toISOString(),
      session.completedAt?.toISOString(),
      session.deletedAt?.toISOString()
    ];
  }
  
  async save(session: Session): Promise<void> {
    const sql = `
      INSERT INTO sessions (
        session_id, name, working_dir, task, status, continue_chat,
        previous_session_id, tool_session_id, process_id, dangerously_skip_permissions,
        last_user_message, message_count, sort_order, uses_beads,
        workflow_stage_id, work_item_id,
        error, provider, created_at, updated_at, completed_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, this.mapSessionToRow(session));

    // Record status history
    await this.recordStatusHistory(session.sessionId, null, session.status, 'created');
  }
  
  async update(session: Session): Promise<void> {
    // Get old session to record status change
    const oldSession = await this.findById(session.sessionId);
    const oldStatus = oldSession?.status;
    
    session.updatedAt = new Date();
    
    const sql = `
      UPDATE sessions SET
        name = ?, working_dir = ?, task = ?, status = ?, continue_chat = ?,
        previous_session_id = ?, tool_session_id = ?, process_id = ?, dangerously_skip_permissions = ?,
        last_user_message = ?, message_count = ?, sort_order = ?, uses_beads = ?,
        workflow_stage_id = ?, work_item_id = ?,
        error = ?, provider = ?, updated_at = ?, completed_at = ?, deleted_at = ?
      WHERE session_id = ?
    `;

    const params = [
      session.name,
      session.workingDir,
      session.task,
      session.status,
      session.continueChat ? 1 : 0,
      session.previousSessionId,
      session.toolSessionId,
      session.processId,
      session.dangerouslySkipPermissions ? 1 : 0,
      session.lastUserMessage,
      session.messageCount || 0,
      session.sortOrder,
      session.usesBeads ? 1 : 0,
      session.workflow_stage_id,
      session.work_item_id,
      session.error,
      session.provider || ToolType.CLAUDE,
      session.updatedAt.toISOString(),
      session.completedAt?.toISOString(),
      session.deletedAt?.toISOString(),
      session.sessionId
    ];
    
    await this.db.run(sql, params);
    
    // Record status history if status changed
    if (oldStatus && oldStatus !== session.status) {
      await this.recordStatusHistory(session.sessionId, oldStatus, session.status, 'updated');
    }
  }
  }
  
  async findById(sessionId: string): Promise<Session | null> {
    const sql = `
      SELECT * FROM sessions 
      WHERE session_id = ? AND deleted_at IS NULL
    `;
    
    const row = await this.db.get<SessionRow>(sql, [sessionId]);
    return row ? this.mapRowToSession(row) : null;
  }

  async findByWorkItem(workItemId: string): Promise<Session[]> {
    const sql = `
      SELECT * FROM sessions
      WHERE work_item_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const rows = await this.db.all<SessionRow>(sql, [workItemId]);
    return rows.map(this.mapRowToSession.bind(this));
  }

  async findAll(): Promise<Session[]> {
    const sql = `
      SELECT * FROM sessions
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const rows = await this.db.all<SessionRow>(sql);
    return rows.map(this.mapRowToSession.bind(this));
  }
  
  async updateWorkItemId(sessionId: string, workItemId: string | null): Promise<void> {
    const sql = `
      UPDATE sessions SET
        work_item_id = ?,
        updated_at = ?
      WHERE session_id = ?
    `;

    await this.db.run(sql, [workItemId, new Date().toISOString(), sessionId]);
  }

  async delete(sessionId: string): Promise<void> {
    const sql = `
      UPDATE sessions
      SET deleted_at = ?, updated_at = ?
      WHERE session_id = ?
    `;

    await this.db.run(sql, [new Date().toISOString(), new Date().toISOString(), sessionId]);
  }
  
  private async recordStatusHistory(
    sessionId: string, 
    oldStatus: SessionStatus | null, 
    newStatus: SessionStatus | string, 
    reason: string
  ): Promise<void> {
    const sql = `
      INSERT INTO session_status_history (session_id, old_status, new_status, reason)
      VALUES (?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [sessionId, oldStatus, newStatus, reason]);
  }
  
  async getStatusHistory(sessionId: string): Promise<any[]> {
    const sql = `
      SELECT * FROM session_status_history 
      WHERE session_id = ? 
      ORDER BY timestamp DESC
    `;
    
    return await this.db.all(sql, [sessionId]);
  }
  
  // Statistics and analytics
  async getSessionStats(): Promise<{
    total: number;
    running: number;
    completed: number;
    error: number;
    deleted: number;
  }> {
    const stats = await this.db.get<any>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'idle' AND deleted_at IS NULL THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status = 'completed' AND deleted_at IS NULL THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' AND deleted_at IS NULL THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted
      FROM sessions
    `);
    
    return {
      total: stats.total || 0,
      running: stats.running || 0,
      completed: stats.completed || 0,
      error: stats.error || 0,
      deleted: stats.deleted || 0
    };
  }
  
  // Cleanup methods
  async cleanupOldDeletedSessions(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await this.db.run(`
      DELETE FROM sessions 
      WHERE deleted_at IS NOT NULL 
      AND deleted_at < ?
    `, [cutoffDate.toISOString()]);
    
    return result.changes || 0;
  }

  // Claude Session ID management
  async updateToolSessionId(sessionId: string, toolSessionId: string): Promise<void> {
    const sql = `
      UPDATE sessions SET 
        tool_session_id = ?, 
        updated_at = ?
      WHERE session_id = ?
    `;

    await this.db.run(sql, [toolSessionId, new Date().toISOString(), sessionId]);
  }

  async findByToolSessionId(toolSessionId: string): Promise<Session | null> {
    const sql = `
      SELECT * FROM sessions 
      WHERE tool_session_id = ? 
      AND deleted_at IS NULL 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const row = await this.db.get<SessionRow>(sql, [toolSessionId]);
    return row ? this.mapRowToSession(row) : null;
  }

  async findByClaudeSessionId(claudeSessionId: string): Promise<Session | null> {
    const sql = `
      SELECT * FROM sessions 
      WHERE tool_session_id = ? 
      AND deleted_at IS NULL 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const row = await this.db.get<SessionRow>(sql, [claudeSessionId]);
    return row ? this.mapRowToSession(row) : null;
  }

  async getSessionsWithClaudeId(): Promise<Session[]> {
    const sql = `
      SELECT * FROM sessions 
      WHERE claude_session_id IS NOT NULL 
      AND deleted_at IS NULL 
      ORDER BY created_at DESC
    `;
    
    const rows = await this.db.all<SessionRow>(sql);
    return rows.map(row => this.mapRowToSession(row));
  }

  // Find sessions that can be continued (with Claude session ID)
  async getContinuableSessions(): Promise<Session[]> {
    const sql = `
      SELECT * FROM sessions 
      WHERE claude_session_id IS NOT NULL 
      AND status IN ('completed', 'interrupted') 
      AND deleted_at IS NULL 
      ORDER BY updated_at DESC
    `;
    
    const rows = await this.db.all<SessionRow>(sql);
    return rows.map(row => this.mapRowToSession(row));
  }

  async updateSortOrder(sessionId: string, sortOrder: number): Promise<void> {
    const sql = `
      UPDATE sessions 
      SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `;
    
    await this.db.run(sql, [sortOrder, sessionId]);
  }

  // 獲取 session 的專案資訊
  async getSessionProjects(sessionId: string): Promise<any[]> {
    const sql = `
      SELECT p.project_id, p.name, p.color, p.icon
      FROM projects p
      INNER JOIN session_projects sp ON p.project_id = sp.project_id
      WHERE sp.session_id = ?
      ORDER BY p.name
    `;
    
    return await this.db.all(sql, [sessionId]);
  }

  // 獲取 session 的標籤資訊
  async getSessionTags(sessionId: string): Promise<any[]> {
    const sql = `
      SELECT t.tag_id, t.name, t.color, t.type
      FROM tags t
      INNER JOIN session_tags st ON t.tag_id = st.tag_id
      WHERE st.session_id = ?
      ORDER BY t.type, t.name
    `;
    
    return await this.db.all(sql, [sessionId]);
  }

  // 批量獲取多個 sessions 的專案資訊
  async getSessionsProjects(sessionIds: string[]): Promise<Map<string, any[]>> {
    if (sessionIds.length === 0) return new Map();
    
    const placeholders = sessionIds.map(() => '?').join(',');
    const sql = `
      SELECT sp.session_id, p.project_id, p.name, p.color, p.icon
      FROM projects p
      INNER JOIN session_projects sp ON p.project_id = sp.project_id
      WHERE sp.session_id IN (${placeholders})
      ORDER BY sp.session_id, p.name
    `;
    
    const rows = await this.db.all(sql, sessionIds);
    
    // 將結果按 session_id 分組
    const result = new Map<string, any[]>();
    for (const row of rows) {
      const sessionId = row.session_id;
      if (!result.has(sessionId)) {
        result.set(sessionId, []);
      }
      result.get(sessionId)!.push({
        project_id: row.project_id,
        name: row.name,
        color: row.color,
        icon: row.icon
      });
    }
    
    return result;
  }

  // 批量獲取多個 sessions 的標籤資訊
  async getSessionsTags(sessionIds: string[]): Promise<Map<string, any[]>> {
    if (sessionIds.length === 0) return new Map();
    
    const placeholders = sessionIds.map(() => '?').join(',');
    const sql = `
      SELECT st.session_id, t.tag_id, t.name, t.color, t.type
      FROM tags t
      INNER JOIN session_tags st ON t.tag_id = st.tag_id
      WHERE st.session_id IN (${placeholders})
      ORDER BY st.session_id, t.type, t.name
    `;
    
    const rows = await this.db.all(sql, sessionIds);
    
    // 將結果按 session_id 分組
    const result = new Map<string, any[]>();
    for (const row of rows) {
      const sessionId = row.session_id;
      if (!result.has(sessionId)) {
        result.set(sessionId, []);
      }
      result.get(sessionId)!.push({
        tag_id: row.tag_id,
        name: row.name,
        color: row.color,
        type: row.type
      });
    }
    
    return result;
  }
}