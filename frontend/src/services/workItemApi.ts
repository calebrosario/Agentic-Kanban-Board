import axiosInstance from '../utils/axiosInstance';
import { WorkItem, CreateWorkItemRequest, UpdateWorkItemRequest, WorkItemStats } from '../types/workitem';

export const workItemApi = {
  // Create a new work item
  async create(data: CreateWorkItemRequest): Promise<WorkItem> {
    const response = await axiosInstance.post<WorkItem>('/work-items', data);
    return response.data;
  },

  // Get all work items
  async list(status?: string, projectId?: string): Promise<WorkItem[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (projectId) params.append('project_id', projectId);
    
    const response = await axiosInstance.get<WorkItem[]>(`/work-items${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },

  // Get a specific work item
  async get(workItemId: string): Promise<WorkItem> {
    const response = await axiosInstance.get<WorkItem>(`/work-items/${workItemId}`);
    return response.data;
  },

  // Update a work item
  async update(workItemId: string, data: UpdateWorkItemRequest): Promise<WorkItem> {
    const response = await axiosInstance.put<WorkItem>(`/work-items/${workItemId}`, data);
    return response.data;
  },

  // Delete a work item
  async delete(workItemId: string): Promise<void> {
    await axiosInstance.delete(`/work-items/${workItemId}`);
  },

  // Update stages for a work item
  async updateStages(workItemId: string, plannedStages: string[]): Promise<WorkItem> {
    const response = await axiosInstance.put<WorkItem>(`/work-items/${workItemId}/stages`, {
      planned_stages: plannedStages
    });
    return response.data;
  },

  // Set current stage for a work item
  async setCurrentStage(workItemId: string, currentStage: string): Promise<WorkItem> {
    const response = await axiosInstance.put<WorkItem>(`/work-items/${workItemId}/current-stage`, {
      current_stage: currentStage
    });
    return response.data;
  },

  // Associate a session with a work item
  async associateSession(sessionId: string, workItemId: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.put<{ success: boolean }>(`/work-items/sessions/${sessionId}/work-item`, {
      work_item_id: workItemId
    });
    return response.data;
  },

  // Disassociate a session from its work item
  async disassociateSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await axiosInstance.delete<{ success: boolean }>(`/work-items/sessions/${sessionId}/work-item`);
    return response.data;
  },

  // Get work item statistics
  async getStats(): Promise<WorkItemStats> {
    const response = await axiosInstance.get<WorkItemStats>('/work-items/stats');
    return response.data;
  },

  // Get dev.md content for a work item
  async getDevMd(workItemId: string): Promise<string> {
    const response = await axiosInstance.get<{ content: string }>(`/work-items/${workItemId}/devmd`);
    return response.data.content;
  }
};