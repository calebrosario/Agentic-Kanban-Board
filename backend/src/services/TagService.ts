import { TagRepository, Tag } from '../repositories/TagRepository';
import { SessionRepository } from '../repositories/SessionRepository';

export class TagService {
  private tagRepository: TagRepository;
  private sessionRepository: SessionRepository;

  constructor() {
    this.tagRepository = new TagRepository();
    this.sessionRepository = new SessionRepository();
  }

  // Tag management
  async createTag(data: {
    name: string;
    color?: string;
    type?: 'general' | 'activity' | 'topic' | 'department';
  }): Promise<Tag> {
    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Tag name is required');
    }
    
    const normalizedName = data.name.trim().toLowerCase();
    
    if (normalizedName.length > 50) {
      throw new Error('Tag name is too long (max 50 characters)');
    }
    
    // Check if tag already exists
    const existing = await this.tagRepository.getTagByName(normalizedName);
    if (existing) {
      throw new Error('Tag with this name already exists');
    }
    
    return await this.tagRepository.createTag({
      name: normalizedName,
      color: data.color,
      type: data.type || 'general'
    });
  }

  async getAllTags(): Promise<Tag[]> {
    return await this.tagRepository.getAllTags();
  }

  async getTagsByType(type: 'general' | 'activity' | 'topic' | 'department'): Promise<Tag[]> {
    return await this.tagRepository.getTagsByType(type);
  }

  async getTagById(tag_id: string): Promise<Tag> {
    const tag = await this.tagRepository.getTagById(tag_id);
    if (!tag) {
      throw new Error('Tag not found');
    }
    return tag;
  }

  async updateTag(tag_id: string, data: {
    name?: string;
    color?: string;
    type?: 'general' | 'activity' | 'topic' | 'department';
  }): Promise<Tag> {
    // Validate input
    if (data.name !== undefined) {
      const normalizedName = data.name.trim().toLowerCase();
      
      if (normalizedName.length === 0) {
        throw new Error('Tag name cannot be empty');
      }
      
      if (normalizedName.length > 50) {
        throw new Error('Tag name is too long (max 50 characters)');
      }
      
      // Check if another tag with this name exists
      const existing = await this.tagRepository.getTagByName(normalizedName);
      if (existing && existing.tag_id !== tag_id) {
        throw new Error('Another tag with this name already exists');
      }
      
      data.name = normalizedName;
    }
    
    return await this.tagRepository.updateTag(tag_id, data);
  }

  async deleteTag(tag_id: string): Promise<void> {
    // Check if tag exists
    await this.getTagById(tag_id);
    
    // Delete tag (will cascade delete session associations)
    await this.tagRepository.deleteTag(tag_id);
  }

  // Session-Tag associations
  async assignTagToSession(session_id: string, tag_id: string): Promise<void> {
    // Validate session exists
    const session = await this.sessionRepository.findById(session_id);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Validate tag exists
    await this.getTagById(tag_id);
    
    await this.tagRepository.assignSessionTag(session_id, tag_id);
  }

  async removeTagFromSession(session_id: string, tag_id: string): Promise<void> {
    await this.tagRepository.removeSessionTag(session_id, tag_id);
  }

  async assignTagsToSession(session_id: string, tag_ids: string[]): Promise<void> {
    // Validate session exists
    const session = await this.sessionRepository.findById(session_id);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Validate all tags exist
    for (const tag_id of tag_ids) {
      await this.getTagById(tag_id);
    }
    
    await this.tagRepository.assignSessionTags(session_id, tag_ids);
  }

  async updateSessionTags(session_id: string, tag_ids: string[]): Promise<void> {
    // Remove all existing tags
    await this.tagRepository.removeAllSessionTags(session_id);
    
    // Assign new tags
    if (tag_ids.length > 0) {
      await this.assignTagsToSession(session_id, tag_ids);
    }
  }

  async getTagsBySessionId(session_id: string): Promise<Tag[]> {
    return await this.tagRepository.getTagsBySessionId(session_id);
  }

  async getSessionsByTagId(tag_id: string): Promise<string[]> {
    return await this.tagRepository.getSessionsByTagId(tag_id);
  }

  // Tag suggestions and utilities
  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    return await this.tagRepository.getPopularTags(limit);
  }

  async findOrCreateTag(name: string, type: 'general' | 'activity' | 'topic' | 'department' = 'general'): Promise<Tag> {
    const normalizedName = name.trim().toLowerCase();
    
    if (normalizedName.length === 0) {
      throw new Error('Tag name is required');
    }
    
    if (normalizedName.length > 50) {
      throw new Error('Tag name is too long (max 50 characters)');
    }
    
    return await this.tagRepository.findOrCreateTag(normalizedName, type);
  }

  async assignTagsByNames(session_id: string, tagNames: string[], type: 'general' | 'activity' | 'topic' | 'department' = 'general'): Promise<void> {
    // Validate session exists
    const session = await this.sessionRepository.findById(session_id);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const tag_ids: string[] = [];
    
    // Find or create each tag
    for (const tagName of tagNames) {
      const tag = await this.findOrCreateTag(tagName, type);
      tag_ids.push(tag.tag_id);
    }
    
    // Update session tags
    await this.updateSessionTags(session_id, tag_ids);
  }
}