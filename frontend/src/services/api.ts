import axiosInstance from '../utils/axiosInstance';
import { Session, CreateSessionRequest, Message, SystemStats } from '../types/session.types';

// 使用共用的 axiosInstance
const api = axiosInstance;

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

export default api;