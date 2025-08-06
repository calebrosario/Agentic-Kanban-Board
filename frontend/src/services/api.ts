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

// 使用共用的 axiosInstance
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

  // 刪除 Session
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

  // 發送訊息
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

  // 獲取訊息
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

  // 獲取系統統計
  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get<SystemStats>('/sessions/system/stats');
    return response.data;
  },

  // 重新排序 Sessions
  async reorderSessions(status: string, sessionIds: string[]): Promise<void> {
    await api.put('/sessions/reorder', { status, sessionIds });
  },
};

// Common Paths API
export const commonPathApi = {
  // 獲取所有常用路徑
  async getAllPaths(): Promise<CommonPath[]> {
    const response = await api.get<{ success: boolean; data: CommonPath[] }>('/common-paths');
    return response.data.data;
  },

  // 獲取單個路徑
  async getPath(id: string): Promise<CommonPath> {
    const response = await api.get<{ success: boolean; data: CommonPath }>(`/common-paths/${id}`);
    return response.data.data;
  },

  // 創建新路徑
  async createPath(path: Omit<CommonPath, 'id' | 'created_at' | 'updated_at'>): Promise<CommonPath> {
    const response = await api.post<{ success: boolean; data: CommonPath }>('/common-paths', path);
    return response.data.data;
  },

  // 更新路徑
  async updatePath(id: string, updates: Partial<Omit<CommonPath, 'id' | 'created_at'>>): Promise<CommonPath> {
    const response = await api.put<{ success: boolean; data: CommonPath }>(`/common-paths/${id}`, updates);
    return response.data.data;
  },

  // 刪除路徑
  async deletePath(id: string): Promise<void> {
    await api.delete(`/common-paths/${id}`);
  },

  // 重新排序路徑
  async reorderPaths(paths: { id: string; sort_order: number }[]): Promise<void> {
    await api.post('/common-paths/reorder', { paths });
  },

  // 重置為預設值
  async resetToDefault(): Promise<CommonPath[]> {
    const response = await api.post<{ success: boolean; data: CommonPath[] }>('/common-paths/reset');
    return response.data.data;
  },
};

// Projects API
export const projectApi = {
  // 獲取所有專案
  async getAllProjects(): Promise<Project[]> {
    const response = await api.get<{ success: boolean; data: Project[] }>('/projects');
    return response.data.data;
  },

  // 獲取活躍專案
  async getActiveProjects(): Promise<Project[]> {
    const response = await api.get<{ success: boolean; data: Project[] }>('/projects/active');
    return response.data.data;
  },

  // 獲取單個專案
  async getProject(projectId: string): Promise<Project> {
    const response = await api.get<{ success: boolean; data: Project }>(`/projects/${projectId}`);
    return response.data.data;
  },

  // 創建新專案
  async createProject(project: CreateProjectRequest): Promise<Project> {
    const response = await api.post<{ success: boolean; data: Project }>('/projects', project);
    return response.data.data;
  },

  // 更新專案
  async updateProject(projectId: string, updates: UpdateProjectRequest): Promise<Project> {
    const response = await api.put<{ success: boolean; data: Project }>(`/projects/${projectId}`, updates);
    return response.data.data;
  },

  // 刪除專案
  async deleteProject(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}`);
  },

  // 獲取專案統計
  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const response = await api.get<{ success: boolean; data: ProjectStats }>(`/projects/${projectId}/stats`);
    return response.data.data;
  },

  // 獲取對話的專案列表
  async getProjectsBySessionId(sessionId: string): Promise<Project[]> {
    const response = await api.get<{ success: boolean; data: Project[] }>(`/projects/sessions/${sessionId}/projects`);
    return response.data.data;
  },

  // 更新對話的專案（替換所有）
  async updateSessionProjects(sessionId: string, projectIds: string[]): Promise<void> {
    await api.put(`/projects/sessions/${sessionId}/projects`, { projectIds });
  },
};

// Tags API
export const tagApi = {
  // 獲取所有標籤
  async getAllTags(): Promise<Tag[]> {
    const response = await api.get<{ success: boolean; data: Tag[] }>('/tags');
    return response.data.data;
  },

  // 按類型獲取標籤
  async getTagsByType(type: 'general' | 'activity' | 'topic' | 'department'): Promise<Tag[]> {
    const response = await api.get<{ success: boolean; data: Tag[] }>(`/tags/type/${type}`);
    return response.data.data;
  },

  // 獲取熱門標籤
  async getPopularTags(limit: number = 10): Promise<Tag[]> {
    const response = await api.get<{ success: boolean; data: Tag[] }>('/tags/popular', {
      params: { limit }
    });
    return response.data.data;
  },

  // 獲取單個標籤
  async getTag(tagId: string): Promise<Tag> {
    const response = await api.get<{ success: boolean; data: Tag }>(`/tags/${tagId}`);
    return response.data.data;
  },

  // 創建新標籤
  async createTag(tag: CreateTagRequest): Promise<Tag> {
    const response = await api.post<{ success: boolean; data: Tag }>('/tags', tag);
    return response.data.data;
  },

  // 更新標籤
  async updateTag(tagId: string, updates: UpdateTagRequest): Promise<Tag> {
    const response = await api.put<{ success: boolean; data: Tag }>(`/tags/${tagId}`, updates);
    return response.data.data;
  },

  // 刪除標籤
  async deleteTag(tagId: string): Promise<void> {
    await api.delete(`/tags/${tagId}`);
  },

  // 獲取對話的標籤列表
  async getTagsBySessionId(sessionId: string): Promise<Tag[]> {
    const response = await api.get<{ success: boolean; data: Tag[] }>(`/tags/sessions/${sessionId}/tags`);
    return response.data.data;
  },

  // 更新對話的標籤（替換所有）
  async updateSessionTags(sessionId: string, tagIds: string[]): Promise<void> {
    await api.put(`/tags/sessions/${sessionId}/tags`, { tagIds });
  },

  // 按名稱分配標籤（會自動創建不存在的標籤）
  async assignTagsByNames(sessionId: string, tagNames: string[], type?: 'general' | 'activity' | 'topic' | 'department'): Promise<void> {
    await api.post(`/tags/sessions/${sessionId}/tags/by-names`, { tagNames, type });
  },
};

export default api;