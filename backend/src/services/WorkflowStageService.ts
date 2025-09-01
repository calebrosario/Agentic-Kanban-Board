import { 
  WorkflowStageRepository, 
  WorkflowStage, 
  CreateWorkflowStageRequest, 
  UpdateWorkflowStageRequest 
} from '../repositories/WorkflowStageRepository';
import { ValidationError } from './SessionService';
import { agentPromptService } from './AgentPromptService';

export class WorkflowStageService {
  private repository: WorkflowStageRepository;

  constructor() {
    this.repository = new WorkflowStageRepository();
  }

  async getAllStages(activeOnly: boolean = false): Promise<WorkflowStage[]> {
    return await this.repository.findAll(activeOnly);
  }

  async getStage(stageId: string): Promise<WorkflowStage> {
    const stage = await this.repository.findById(stageId);
    if (!stage) {
      throw new ValidationError('Workflow stage not found', 'STAGE_NOT_FOUND');
    }
    return stage;
  }

  async getStageByName(name: string): Promise<WorkflowStage> {
    const stage = await this.repository.findByName(name);
    if (!stage) {
      throw new ValidationError('Workflow stage not found', 'STAGE_NOT_FOUND');
    }
    return stage;
  }

  async createStage(request: CreateWorkflowStageRequest): Promise<WorkflowStage> {
    // Validate required fields - either system_prompt or agent_ref must be provided
    if (!request.name || (!request.system_prompt && !request.agent_ref)) {
      throw new ValidationError('Name and either system prompt or agent reference are required', 'INVALID_REQUEST');
    }

    // Validate Agent reference if provided
    if (request.agent_ref) {
      const agentContent = await agentPromptService.getAgentContent(request.agent_ref);
      if (!agentContent) {
        throw new ValidationError(`Agent "${request.agent_ref}" 檔案不存在或無法讀取`, 'AGENT_NOT_FOUND');
      }
    }

    // Check if name already exists
    const existing = await this.repository.findByName(request.name);
    if (existing) {
      throw new ValidationError('Stage name already exists', 'DUPLICATE_NAME');
    }


    return await this.repository.create(request);
  }

  async updateStage(stageId: string, request: UpdateWorkflowStageRequest): Promise<WorkflowStage> {
    // Check if stage exists
    const existing = await this.repository.findById(stageId);
    if (!existing) {
      throw new ValidationError('Workflow stage not found', 'STAGE_NOT_FOUND');
    }

    // Validate Agent reference if provided
    if (request.agent_ref) {
      const agentContent = await agentPromptService.getAgentContent(request.agent_ref);
      if (!agentContent) {
        throw new ValidationError(`Agent "${request.agent_ref}" 檔案不存在或無法讀取`, 'AGENT_NOT_FOUND');
      }
    }

    // If updating name, check for duplicates
    if (request.name && request.name !== existing.name) {
      const duplicate = await this.repository.findByName(request.name);
      if (duplicate) {
        throw new ValidationError('Stage name already exists', 'DUPLICATE_NAME');
      }
    }


    const updated = await this.repository.update(stageId, request);
    if (!updated) {
      throw new ValidationError('Failed to update stage', 'UPDATE_FAILED');
    }

    return updated;
  }

  async deleteStage(stageId: string): Promise<void> {
    // 檢查 stage 是否存在
    const stage = await this.repository.findById(stageId);
    if (!stage) {
      throw new ValidationError('Workflow stage not found', 'STAGE_NOT_FOUND');
    }

    // 在刪除之前，先將所有使用此 stage 的 sessions 的 workflow_stage_id 設為 NULL
    const { Database } = await import('../database/database');
    const db = Database.getInstance();
    
    try {
      // 更新所有相關的 sessions
      await db.run(
        `UPDATE sessions SET workflow_stage_id = NULL WHERE workflow_stage_id = ?`,
        [stageId]
      );
      
      // 現在可以安全地刪除 workflow stage
      const deleted = await this.repository.delete(stageId);
      if (!deleted) {
        throw new ValidationError('Failed to delete workflow stage', 'DELETE_FAILED');
      }
    } catch (error: any) {
      throw new ValidationError(
        `刪除工作流程階段時發生錯誤: ${error.message}`,
        'DELETE_ERROR'
      );
    }
  }

  async reorderStages(stageOrders: { stage_id: string; sort_order: number }[]): Promise<void> {
    // Validate all stage IDs exist
    for (const { stage_id } of stageOrders) {
      const stage = await this.repository.findById(stage_id);
      if (!stage) {
        throw new ValidationError(`Stage ${stage_id} not found`, 'STAGE_NOT_FOUND');
      }
    }

    await this.repository.reorder(stageOrders);
  }

  /**
   * 取得工作階段的有效提示詞
   * 如果設定了 agent_ref，優先使用 Agent 提示詞；否則使用自訂提示詞
   */
  async getEffectivePrompt(stageId: string): Promise<{
    content: string;
    source: 'agent' | 'custom';
    agentName?: string;
  }> {
    const stage = await this.getStage(stageId);
    
    if (stage.agent_ref) {
      try {
        const agentContent = await agentPromptService.getAgentContent(stage.agent_ref);
        if (agentContent?.content) {
          return {
            content: agentContent.content,
            source: 'agent',
            agentName: stage.agent_ref
          };
        }
      } catch (error) {
        // Agent 讀取失敗，拋出錯誤（阻斷式處理）
        throw new ValidationError(`Agent "${stage.agent_ref}" 檔案不存在或無法讀取`, 'AGENT_NOT_FOUND');
      }
    }
    
    // 使用自訂提示詞
    return {
      content: stage.system_prompt || '',
      source: 'custom'
    };
  }

  /**
   * 檢查 Agent 是否存在（用於前端驗證）
   */
  async checkAgentExists(agentName: string): Promise<boolean> {
    try {
      const agentContent = await agentPromptService.getAgentContent(agentName);
      return !!agentContent;
    } catch (error) {
      return false;
    }
  }

}