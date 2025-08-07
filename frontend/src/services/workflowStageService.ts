import axiosInstance from '../utils/axiosInstance';

export interface WorkflowStage {
  stage_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  temperature: number;
  suggested_tasks?: string[];
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateWorkflowStageRequest {
  name: string;
  description?: string;
  system_prompt: string;
  temperature?: number;
  suggested_tasks?: string[];
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface UpdateWorkflowStageRequest {
  name?: string;
  description?: string;
  system_prompt?: string;
  temperature?: number;
  suggested_tasks?: string[];
  color?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

export const workflowStageService = {
  // 獲取所有工作流程階段
  async getAllStages(activeOnly: boolean = false): Promise<WorkflowStage[]> {
    const params = activeOnly ? { params: { active: true } } : {};
    const response = await axiosInstance.get<WorkflowStage[]>('/workflow-stages', params);
    return response.data;
  },

  // 獲取單個工作流程階段
  async getStage(stageId: string): Promise<WorkflowStage> {
    const response = await axiosInstance.get<WorkflowStage>(`/workflow-stages/${stageId}`);
    return response.data;
  },

  // 創建新的工作流程階段
  async createStage(request: CreateWorkflowStageRequest): Promise<WorkflowStage> {
    const response = await axiosInstance.post<WorkflowStage>('/workflow-stages', request);
    return response.data;
  },

  // 更新工作流程階段
  async updateStage(stageId: string, request: UpdateWorkflowStageRequest): Promise<WorkflowStage> {
    const response = await axiosInstance.put<WorkflowStage>(`/workflow-stages/${stageId}`, request);
    return response.data;
  },

  // 刪除工作流程階段
  async deleteStage(stageId: string): Promise<void> {
    await axiosInstance.delete(`/workflow-stages/${stageId}`);
  },

  // 重新排序階段
  async reorderStages(stages: { stage_id: string; sort_order: number }[]): Promise<void> {
    await axiosInstance.post('/workflow-stages/reorder', { stages });
  },

  // 初始化預設階段
  async initializeDefaults(): Promise<void> {
    await axiosInstance.post('/workflow-stages/initialize');
  }
};