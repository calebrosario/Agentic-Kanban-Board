import axiosInstance from '../utils/axiosInstance';
import { Session, CreateSessionRequest, Message, SystemStats } from '../types/session.types';
import { 
  Project, 
  Tag, 
  CreateProjectRequest, 
  CreateTagRequest, 
  UpdateProjectRequest, 
  UpdateTagRequest,
  ProjectStats 
} from '../types/classification.types';

// Use shared axiosInstance
const api = axiosInstance;

// Common Path Types
export interface CommonPath {
  id: string;
  label: string;
  path: string;
  icon: 'FolderOpen' | 'Code' | 'Home';
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export const sessionApi = {
  // 獲取所有 Sessions
  async getAllSessions(): Promise<Session[]> {
    const response = await api.get<Session[]>('/sessions');
    return response.data.map(session => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      completedAt: session.completedAt ? new Date(session.completedAt) : undefined,
      deletedAt: session.deletedAt ? new Date(session.deletedAt) : undefined,
    }));
  },

  // 獲取單個 Session
  async getSession(sessionId: string): Promise<Session> {
    const response = await api.get<Session>(`/sessions/${sessionId}`);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
      deletedAt: response.data.deletedAt ? new Date(response.data.deletedAt) : undefined,
    };
  },

  // 建立新 Session
  async createSession(request: CreateSessionRequest): Promise<Session> {
    const response = await api.post<Session>('/sessions', request);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
      deletedAt: response.data.deletedAt ? new Date(response.data.deletedAt) : undefined,
    };
  },

  // 完成 Session
  async completeSession(sessionId: string): Promise<Session> {
    const response = await api.post<Session>(`/sessions/${sessionId}/complete`);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
      deletedAt: response.data.deletedAt ? new Date(response.data.deletedAt) : undefined,
    };
  },

  // Delete Session
  async deleteSession(sessionId: string): Promise<void> {
    await api.delete(`/sessions/${sessionId}`);
  },

  // 中斷 Session
  async interruptSession(sessionId: string): Promise<Session> {
    const response = await api.post<Session>(`/sessions/${sessionId}/interrupt`);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
      deletedAt: response.data.deletedAt ? new Date(response.data.deletedAt) : undefined,
    };
  },

  // 恢復 Session
  async resumeSession(sessionId: string): Promise<Session> {
    const response = await api.post<Session>(`/sessions/${sessionId}/resume`);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      completedAt: response.data.completedAt ? new Date(response.data.completedAt) : undefined,
      deletedAt: response.data.deletedAt ? new Date(response.data.deletedAt) : undefined,
    };
  },

  // Send message
  async sendMessage(sessionId: string, content: string): Promise<Message> {
    const response = await api.post(`/sessions/${sessionId}/messages`, { content });
    const msg = response.data;
    return {
      messageId: msg.messageId,
      sessionId: msg.sessionId,
      type: msg.type,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      compressed: msg.compressed,
      originalSize: msg.originalSize,
      compressedSize: msg.compressedSize,
      metadata: msg.metadata
    };
  },

  // Get messages
  async getMessages(sessionId: string, page: number = 1, limit: number = 50): Promise<{
    messages: Message[];
    pagination: {
      total: number;
      page: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const response = await api.get(`/sessions/${sessionId}/messages`, {
      params: { page, limit }
    });
    
    return {
      messages: response.data.messages.map((msg: any) => ({
        messageId: msg.messageId,
        sessionId: msg.sessionId,
        type: msg.type,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        compressed: msg.compressed,
        originalSize: msg.originalSize,
        compressedSize: msg.compressedSize,
        metadata: msg.metadata
      })),
      pagination: response.data.pagination,
    };
  },

  // Get system statistics
  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get<SystemStats>('/sessions/system/stats');
    return response.data;
  },

  // Reorder Sessions
  async reorderSessions(status: string, sessionIds: string[]): Promise<void> {
    await api.put('/sessions/reorder', { status, sessionIds });
  },
};

// Common Paths API
export const commonPathApi = {
  // Get all common paths
  async getAllPaths(): Promise<CommonPath[]> {
    const response = await api.get<{ success: boolean; data: CommonPath[] }>('/common-paths');
    return response.data.data;
  },

  // Get single path
  async getPath(id: string): Promise<CommonPath> {
    const response = await api.get<{ success: boolean; data: CommonPath }>(`/common-paths/${id}`);
    return response.data.data;
  },

  // Create new path
  async createPath(path: Omit<CommonPath, 'id' | 'created_at' | 'updated_at'>): Promise<CommonPath> {
    const response = await api.post<{ success: boolean; data: CommonPath }>('/common-paths', path);
    return response.data.data;
  },

  // Update path
  async updatePath(id: string, updates: Partial<Omit<CommonPath, 'id' | 'created_at'>>): Promise<CommonPath> {
    const response = await api.put<{ success: boolean; data: CommonPath }>(`/common-paths/${id}`, updates);
    return response.data.data;
  },

  // Delete path
  async deletePath(id: string): Promise<void> {
    await api.delete(`/common-paths/${id}`);
  },

  // Reorder paths
  async reorderPaths(paths: { id: string; sort_order: number }[]): Promise<void> {
    await api.post('/common-paths/reorder', { paths });
  },

  // Reset to default values
  async resetToDefault(): Promise<CommonPath[]> {
    const response = await api.post<{ success: boolean; data: CommonPath[] }>('/common-paths/reset');
    return response.data.data;
  },
};

// Projects API
export const projectApi = {
  // Get all projects
  async getAllProjects(): Promise<Project[]> {
    const response = await api.get<{ success: boolean; data: Project[] }>('/projects');
    return response.data.data;
  },

  // Get active projects
  async getActiveProjects(): Promise<Project[]> {
    const response = await api.get<{ success: boolean; data: Project[] }>('/projects/active');
    return response.data.data;
  },

  // Get single project
  async getProject(projectId: string): Promise<Project> {
    const response = await api.get<{ success: boolean; data: Project }>(`/projects/${projectId}`);
    return response.data.data;
  },

  // Create new project
  async createProject(project: CreateProjectRequest): Promise<Project> {
    const response = await api.post<{ success: boolean; data: Project }>('/projects', project);
    return response.data.data;
  },

  // Update project
  async updateProject(projectId: string, updates: UpdateProjectRequest): Promise<Project> {
    const response = await api.put<{ success: boolean; data: Project }>(`/projects/${projectId}`, updates);
    return response.data.data;
  },

  // Delete project
  async deleteProject(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}`);
  },

  // Get project statistics
  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const response = await api.get<{ success: boolean; data: ProjectStats }>(`/projects/${projectId}/stats`);
    return response.data.data;
  },

  // Get projects for session
  async getProjectsBySessionId(sessionId: string): Promise<Project[]> {
    const response = await api.get<{ success: boolean; data: Project[] }>(`/projects/sessions/${sessionId}/projects`);
    return response.data.data;
  },

  // Update session projects (replace all)
  async updateSessionProjects(sessionId: string, projectIds: string[]): Promise<void> {
    await api.put(`/projects/sessions/${sessionId}/projects`, { projectIds });
  },
};

// Tags API
export const tagApi = {
  // Get all tags
  async getAllTags(): Promise<Tag[]> {
    const response = await api.get<{ success: boolean; data: Tag[] }>('/tags');
    return response.data.data;
  },

  // Get tags by type
  async getTagsByType(type: 'general' | 'activity' | 'topic' | 'department'): Promise<Tag[]> {
    const response = await api.get<{ success: boolean; data: Tag[] }>(`/tags/type/${type}`);
    return response.data.data;
  },

  // Get popular tags
  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    const response = await api.get<{ success: boolean; data: Tag[] }>('/tags/popular', {
      params: { limit }
    });
    return response.data.data;
  },

  // Get single tag
  async getTag(tagId: string): Promise<Tag> {
    const response = await api.get<{ success: boolean; data: Tag }>(`/tags/${tagId}`);
    return response.data.data;
  },

  // Create new tag
  async createTag(tag: CreateTagRequest): Promise<Tag> {
    const response = await api.post<{ success: boolean; data: Tag }>('/tags', tag);
    return response.data.data;
  },

  // Update tag
  async updateTag(tagId: string, updates: UpdateTagRequest): Promise<Tag> {
    const response = await api.put<{ success: boolean; data: Tag }>(`/tags/${tagId}`, updates);
    return response.data.data;
  },

  // Delete tag
  async deleteTag(tagId: string): Promise<void> {
    await api.delete(`/tags/${tagId}`);
  },

  // Get tags for session
  async getTagsBySessionId(sessionId: string): Promise<Tag[]> {
    const response = await api.get<{ success: boolean; data: Tag[] }>(`/tags/sessions/${sessionId}/tags`);
    return response.data.data;
  },

  // Update session tags (replace all)
  async updateSessionTags(sessionId: string, tagIds: string[]): Promise<void> {
    await api.put(`/tags/sessions/${sessionId}/tags`, { tagIds });
  },

  // Assign tags by name (auto-creates non-existent tags)
  async assignTagsByNames(sessionId: string, tagNames: string[], type?: 'general' | 'activity' | 'topic' | 'department'): Promise<void> {
    await api.post(`/tags/sessions/${sessionId}/tags/by-names`, { tagNames, type });
  },
};

// Task Template API
import { TaskTemplate, CreateTaskTemplateRequest, UpdateTaskTemplateRequest, ReorderTaskTemplatesRequest } from '../types/taskTemplate.types';

export const taskTemplateApi = {
  // Get all task templates
  async getAllTemplates(): Promise<TaskTemplate[]> {
    const response = await api.get<{ success: boolean; data: TaskTemplate[] }>('/task-templates');
    return response.data.data;
  },

  // Get single task template
  async getTemplate(id: string): Promise<TaskTemplate> {
    const response = await api.get<{ success: boolean; data: TaskTemplate }>(`/task-templates/${id}`);
    return response.data.data;
  },

  // Create new task template
  async createTemplate(data: CreateTaskTemplateRequest): Promise<TaskTemplate> {
    const response = await api.post<{ success: boolean; data: TaskTemplate }>('/task-templates', data);
    return response.data.data;
  },

  // Update task template
  async updateTemplate(id: string, data: UpdateTaskTemplateRequest): Promise<TaskTemplate> {
    const response = await api.put<{ success: boolean; data: TaskTemplate }>(`/task-templates/${id}`, data);
    return response.data.data;
  },

  // Delete任務模板
  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/task-templates/${id}`);
  },

  // 重新排序任務模板
  async reorderTemplates(templates: ReorderTaskTemplatesRequest[]): Promise<void> {
    await api.post('/task-templates/reorder', { templates });
  },

  // 重置為預設模板
  async resetToDefault(): Promise<TaskTemplate[]> {
    const response = await api.post<{ success: boolean; data: TaskTemplate[] }>('/task-templates/reset');
    return response.data.data;
  },
};

export default api;