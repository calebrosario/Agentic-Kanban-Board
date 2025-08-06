import { Database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  project_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status: 'active' | 'completed' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export interface SessionProject {
  session_id: string;
  project_id: string;
  assigned_at?: string;
}

export class ProjectRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  // Project CRUD operations
  async createProject(data: Omit<Project, 'project_id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const project_id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.run(`
      INSERT INTO projects (project_id, name, description, color, icon, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      project_id,
      data.name,
      data.description || null,
      data.color || '#4F46E5',
      data.icon || 'folder',
      data.status || 'active',
      now,
      now
    ]);
    
    const created = await this.getProjectById(project_id);
    if (!created) {
      throw new Error('Failed to create project');
    }
    
    return created;
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.db.all<Project>(`
      SELECT project_id, name, description, color, icon, status, created_at, updated_at
      FROM projects
      ORDER BY created_at DESC
    `);
  }

  async getActiveProjects(): Promise<Project[]> {
    return await this.db.all<Project>(`
      SELECT project_id, name, description, color, icon, status, created_at, updated_at
      FROM projects
      WHERE status = 'active'
      ORDER BY name ASC
    `);
  }

  async getProjectById(project_id: string): Promise<Project | undefined> {
    return await this.db.get<Project>(`
      SELECT project_id, name, description, color, icon, status, created_at, updated_at
      FROM projects
      WHERE project_id = ?
    `, [project_id]);
  }

  async updateProject(project_id: string, data: Partial<Omit<Project, 'project_id' | 'created_at'>>): Promise<Project> {
    const existing = await this.getProjectById(project_id);
    if (!existing) {
      throw new Error('Project not found');
    }
    
    const now = new Date().toISOString();
    const updateFields = [];
    const values = [];
    
    if (data.name !== undefined) {
      updateFields.push('name = ?');
      values.push(data.name);
    }
    
    if (data.description !== undefined) {
      updateFields.push('description = ?');
      values.push(data.description);
    }
    
    if (data.color !== undefined) {
      updateFields.push('color = ?');
      values.push(data.color);
    }
    
    if (data.icon !== undefined) {
      updateFields.push('icon = ?');
      values.push(data.icon);
    }
    
    if (data.status !== undefined) {
      updateFields.push('status = ?');
      values.push(data.status);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now);
    
    values.push(project_id);
    
    await this.db.run(`
      UPDATE projects
      SET ${updateFields.join(', ')}
      WHERE project_id = ?
    `, values);
    
    const updated = await this.getProjectById(project_id);
    if (!updated) {
      throw new Error('Failed to update project');
    }
    
    return updated;
  }

  async deleteProject(project_id: string): Promise<void> {
    const result = await this.db.run(`
      DELETE FROM projects WHERE project_id = ?
    `, [project_id]);
    
    if (result.changes === 0) {
      throw new Error('Project not found');
    }
  }

  // Session-Project relationship operations
  async assignSessionToProject(session_id: string, project_id: string): Promise<void> {
    try {
      await this.db.run(`
        INSERT INTO session_projects (session_id, project_id)
        VALUES (?, ?)
      `, [session_id, project_id]);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        // Already assigned, ignore
        return;
      }
      throw error;
    }
  }

  async removeSessionFromProject(session_id: string, project_id: string): Promise<void> {
    await this.db.run(`
      DELETE FROM session_projects
      WHERE session_id = ? AND project_id = ?
    `, [session_id, project_id]);
  }

  async getProjectsBySessionId(session_id: string): Promise<Project[]> {
    return await this.db.all<Project>(`
      SELECT p.project_id, p.name, p.description, p.color, p.icon, p.status, p.created_at, p.updated_at
      FROM projects p
      INNER JOIN session_projects sp ON p.project_id = sp.project_id
      WHERE sp.session_id = ?
      ORDER BY sp.assigned_at DESC
    `, [session_id]);
  }

  async getSessionsByProjectId(project_id: string): Promise<string[]> {
    const results = await this.db.all<{ session_id: string }>(`
      SELECT session_id
      FROM session_projects
      WHERE project_id = ?
      ORDER BY assigned_at DESC
    `, [project_id]);
    
    return results.map(r => r.session_id);
  }

  async getProjectSessionCount(project_id: string): Promise<number> {
    const result = await this.db.get<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM session_projects
      WHERE project_id = ?
    `, [project_id]);
    
    return result?.count || 0;
  }

  // Batch operations
  async assignSessionToMultipleProjects(session_id: string, project_ids: string[]): Promise<void> {
    await this.db.beginTransaction();
    try {
      for (const project_id of project_ids) {
        await this.assignSessionToProject(session_id, project_id);
      }
      await this.db.commit();
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  async removeSessionFromAllProjects(session_id: string): Promise<void> {
    await this.db.run(`
      DELETE FROM session_projects
      WHERE session_id = ?
    `, [session_id]);
  }
}