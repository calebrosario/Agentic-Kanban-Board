import { Database } from '../database/database';
import { v4 as uuidv4 } from 'uuid';

export interface Tag {
  tag_id: string;
  name: string;
  color?: string;
  type: 'general' | 'activity' | 'topic' | 'department';
  usage_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface SessionTag {
  session_id: string;
  tag_id: string;
  assigned_at?: string;
}

export class TagRepository {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  // Tag CRUD operations
  async createTag(data: Omit<Tag, 'tag_id' | 'usage_count' | 'created_at' | 'updated_at'>): Promise<Tag> {
    const tag_id = uuidv4();
    const now = new Date().toISOString();
    
    await this.db.run(`
      INSERT INTO tags (tag_id, name, color, type, usage_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      tag_id,
      data.name,
      data.color || '#6B7280',
      data.type || 'general',
      0,
      now,
      now
    ]);
    
    const created = await this.getTagById(tag_id);
    if (!created) {
      throw new Error('Failed to create tag');
    }
    
    return created;
  }

  async getAllTags(): Promise<Tag[]> {
    return await this.db.all<Tag>(`
      SELECT tag_id, name, color, type, usage_count, created_at, updated_at
      FROM tags
      ORDER BY usage_count DESC, name ASC
    `);
  }

  async getTagsByType(type: string): Promise<Tag[]> {
    return await this.db.all<Tag>(`
      SELECT tag_id, name, color, type, usage_count, created_at, updated_at
      FROM tags
      WHERE type = ?
      ORDER BY usage_count DESC, name ASC
    `, [type]);
  }

  async getTagById(tag_id: string): Promise<Tag | undefined> {
    return await this.db.get<Tag>(`
      SELECT tag_id, name, color, type, usage_count, created_at, updated_at
      FROM tags
      WHERE tag_id = ?
    `, [tag_id]);
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    return await this.db.get<Tag>(`
      SELECT tag_id, name, color, type, usage_count, created_at, updated_at
      FROM tags
      WHERE name = ?
    `, [name]);
  }

  async updateTag(tag_id: string, data: Partial<Omit<Tag, 'tag_id' | 'usage_count' | 'created_at'>>): Promise<Tag> {
    const existing = await this.getTagById(tag_id);
    if (!existing) {
      throw new Error('Tag not found');
    }
    
    const now = new Date().toISOString();
    const updateFields = [];
    const values = [];
    
    if (data.name !== undefined) {
      updateFields.push('name = ?');
      values.push(data.name);
    }
    
    if (data.color !== undefined) {
      updateFields.push('color = ?');
      values.push(data.color);
    }
    
    if (data.type !== undefined) {
      updateFields.push('type = ?');
      values.push(data.type);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now);
    
    values.push(tag_id);
    
    await this.db.run(`
      UPDATE tags
      SET ${updateFields.join(', ')}
      WHERE tag_id = ?
    `, values);
    
    const updated = await this.getTagById(tag_id);
    if (!updated) {
      throw new Error('Failed to update tag');
    }
    
    return updated;
  }

  async deleteTag(tag_id: string): Promise<void> {
    const result = await this.db.run(`
      DELETE FROM tags WHERE tag_id = ?
    `, [tag_id]);
    
    if (result.changes === 0) {
      throw new Error('Tag not found');
    }
  }

  async incrementUsageCount(tag_id: string): Promise<void> {
    await this.db.run(`
      UPDATE tags
      SET usage_count = usage_count + 1
      WHERE tag_id = ?
    `, [tag_id]);
  }

  async decrementUsageCount(tag_id: string): Promise<void> {
    await this.db.run(`
      UPDATE tags
      SET usage_count = MAX(0, usage_count - 1)
      WHERE tag_id = ?
    `, [tag_id]);
  }

  // Session-Tag relationship operations
  async assignSessionTag(session_id: string, tag_id: string): Promise<void> {
    try {
      await this.db.run(`
        INSERT INTO session_tags (session_id, tag_id)
        VALUES (?, ?)
      `, [session_id, tag_id]);
      
      // Increment usage count
      await this.incrementUsageCount(tag_id);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        // Already assigned, ignore
        return;
      }
      throw error;
    }
  }

  async removeSessionTag(session_id: string, tag_id: string): Promise<void> {
    const result = await this.db.run(`
      DELETE FROM session_tags
      WHERE session_id = ? AND tag_id = ?
    `, [session_id, tag_id]);
    
    if (result.changes > 0) {
      // Decrement usage count
      await this.decrementUsageCount(tag_id);
    }
  }

  async getTagsBySessionId(session_id: string): Promise<Tag[]> {
    return await this.db.all<Tag>(`
      SELECT t.tag_id, t.name, t.color, t.type, t.usage_count, t.created_at, t.updated_at
      FROM tags t
      INNER JOIN session_tags st ON t.tag_id = st.tag_id
      WHERE st.session_id = ?
      ORDER BY st.assigned_at DESC
    `, [session_id]);
  }

  async getSessionsByTagId(tag_id: string): Promise<string[]> {
    const results = await this.db.all<{ session_id: string }>(`
      SELECT session_id
      FROM session_tags
      WHERE tag_id = ?
      ORDER BY assigned_at DESC
    `, [tag_id]);
    
    return results.map(r => r.session_id);
  }

  // Batch operations
  async assignSessionTags(session_id: string, tag_ids: string[]): Promise<void> {
    await this.db.beginTransaction();
    try {
      for (const tag_id of tag_ids) {
        await this.assignSessionTag(session_id, tag_id);
      }
      await this.db.commit();
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  async removeAllSessionTags(session_id: string): Promise<void> {
    // Get all tags for this session to decrement usage counts
    const tags = await this.getTagsBySessionId(session_id);
    
    await this.db.beginTransaction();
    try {
      // Remove all associations
      await this.db.run(`
        DELETE FROM session_tags
        WHERE session_id = ?
      `, [session_id]);
      
      // Decrement usage counts
      for (const tag of tags) {
        await this.decrementUsageCount(tag.tag_id);
      }
      
      await this.db.commit();
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  // Tag suggestions based on usage
  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return await this.db.all<Tag>(`
      SELECT tag_id, name, color, type, usage_count, created_at, updated_at
      FROM tags
      WHERE usage_count > 0
      ORDER BY usage_count DESC
      LIMIT ?
    `, [limit]);
  }

  // Find or create tag by name
  async findOrCreateTag(name: string, type: 'general' | 'activity' | 'topic' | 'department' = 'general'): Promise<Tag> {
    let tag = await this.getTagByName(name);
    if (!tag) {
      tag = await this.createTag({ name, type });
    }
    return tag;
  }
}