import { Database } from '../database/database';
import { WorkItem, WorkItemStatus } from '../types/workitem.types';
import { v4 as uuidv4 } from 'uuid';

interface WorkItemRow {
  work_item_id: string;
  title: string;
  description?: string;
  workspace_path?: string;
  status: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export class WorkItemRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  private mapRowToWorkItem(row: WorkItemRow): WorkItem {
    return {
      work_item_id: row.work_item_id,
      title: row.title,
      description: row.description,
      workspace_path: row.workspace_path,
      status: row.status as WorkItemStatus,
      project_id: row.project_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }

  private mapWorkItemToRow(workItem: Partial<WorkItem>): any[] {
    return [
      workItem.work_item_id || uuidv4(),
      workItem.title,
      workItem.description,
      workItem.workspace_path,
      workItem.status || WorkItemStatus.PLANNING,
      workItem.project_id,
      workItem.created_at ? workItem.created_at.toISOString() : new Date().toISOString(),
      workItem.updated_at ? workItem.updated_at.toISOString() : new Date().toISOString(),
      workItem.completed_at?.toISOString()
    ];
  }

  async create(workItem: Partial<WorkItem>): Promise<WorkItem> {
    const id = uuidv4();
    const now = new Date();
    
    const newWorkItem: WorkItem = {
      work_item_id: id,
      title: workItem.title!,
      description: workItem.description,
      workspace_path: workItem.workspace_path,
      status: workItem.status || WorkItemStatus.PLANNING,
      project_id: workItem.project_id,
      created_at: now,
      updated_at: now
    };

    const sql = `
      INSERT INTO work_items (
        work_item_id, title, description, workspace_path, status,
        project_id, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, this.mapWorkItemToRow(newWorkItem));
    return newWorkItem;
  }

  async findById(workItemId: string): Promise<WorkItem | null> {
    const sql = `SELECT * FROM work_items WHERE work_item_id = ?`;
    const row = await this.db.get<WorkItemRow>(sql, [workItemId]);
    return row ? this.mapRowToWorkItem(row) : null;
  }

  async findAll(): Promise<WorkItem[]> {
    const sql = `
      SELECT * FROM work_items 
      ORDER BY 
        CASE status 
          WHEN 'in_progress' THEN 1 
          WHEN 'planning' THEN 2 
          WHEN 'completed' THEN 3 
          WHEN 'cancelled' THEN 4 
        END,
        created_at DESC
    `;
    const rows = await this.db.all<WorkItemRow>(sql);
    return rows.map(row => this.mapRowToWorkItem(row));
  }

  async findByStatus(status: WorkItemStatus): Promise<WorkItem[]> {
    const sql = `
      SELECT * FROM work_items 
      WHERE status = ? 
      ORDER BY created_at DESC
    `;
    const rows = await this.db.all<WorkItemRow>(sql, [status]);
    return rows.map(row => this.mapRowToWorkItem(row));
  }

  async findByProject(projectId: string): Promise<WorkItem[]> {
    const sql = `
      SELECT * FROM work_items 
      WHERE project_id = ? 
      ORDER BY status, created_at DESC
    `;
    const rows = await this.db.all<WorkItemRow>(sql, [projectId]);
    return rows.map(row => this.mapRowToWorkItem(row));
  }

  async update(workItemId: string, updates: Partial<WorkItem>): Promise<WorkItem | null> {
    const workItem = await this.findById(workItemId);
    if (!workItem) return null;

    const updatedWorkItem = {
      ...workItem,
      ...updates,
      updated_at: new Date()
    };

    // Handle status change to completed
    if (updates.status === WorkItemStatus.COMPLETED && workItem.status !== WorkItemStatus.COMPLETED) {
      updatedWorkItem.completed_at = new Date();
    }

    const sql = `
      UPDATE work_items SET
        title = ?, description = ?, workspace_path = ?, status = ?,
        project_id = ?, updated_at = ?, completed_at = ?
      WHERE work_item_id = ?
    `;

    const params = [
      updatedWorkItem.title,
      updatedWorkItem.description,
      updatedWorkItem.workspace_path,
      updatedWorkItem.status,
      updatedWorkItem.project_id,
      updatedWorkItem.updated_at.toISOString(),
      updatedWorkItem.completed_at?.toISOString(),
      workItemId
    ];

    await this.db.run(sql, params);
    return updatedWorkItem;
  }

  async delete(workItemId: string): Promise<boolean> {
    const sql = `DELETE FROM work_items WHERE work_item_id = ?`;
    const result = await this.db.run(sql, [workItemId]);
    return (result.changes || 0) > 0;
  }

  async getSessionsForWorkItem(workItemId: string): Promise<any[]> {
    const sql = `
      SELECT * FROM sessions 
      WHERE work_item_id = ? 
      ORDER BY created_at ASC
    `;
    return await this.db.all(sql, [workItemId]);
  }


  async getStats(): Promise<{
    total: number;
    planning: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) as planning,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM work_items
    `;
    
    const stats = await this.db.get<any>(sql);
    return {
      total: stats.total || 0,
      planning: stats.planning || 0,
      in_progress: stats.in_progress || 0,
      completed: stats.completed || 0,
      cancelled: stats.cancelled || 0
    };
  }
}