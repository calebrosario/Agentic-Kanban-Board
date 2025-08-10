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
    const deleted = await this.repository.delete(stageId);
    if (!deleted) {
      throw new ValidationError('Workflow stage not found', 'STAGE_NOT_FOUND');
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

  async initializeDefaultStages(): Promise<void> {
    // Check if any stages exist
    const existingStages = await this.repository.findAll();
    if (existingStages.length > 0) {
      return; // Already initialized
    }

    // Create default workflow stages
    const defaultStages: CreateWorkflowStageRequest[] = [
      {
        name: '需求分析',
        description: '分析和整理用戶需求，產出需求文件',
        system_prompt: `你是一位資深的需求分析專家。請幫助分析用戶需求並產出結構化的需求文件。

你的任務包括：
1. 理解和澄清用戶需求
2. 識別功能性和非功能性需求
3. 定義用戶故事和驗收標準
4. 指出潛在的風險和依賴關係
5. 產出清晰的需求規格文件

請使用結構化的格式，包含背景、目標、範圍、功能需求、非功能需求、約束條件等章節。`,
        suggested_tasks: ['分析功能需求', '整理需求文件', '定義驗收標準'],
        color: '#3B82F6',
        icon: 'clipboard-list',
        sort_order: 1
      },
      {
        name: '技術設計',
        description: '設計系統架構和技術方案',
        system_prompt: `你是一位經驗豐富的系統架構師。請根據需求設計技術方案和系統架構。

你的任務包括：
1. 設計系統架構和組件劃分
2. 選擇適合的技術棧和框架
3. 設計資料模型和 API 介面
4. 考慮性能、安全性和可擴展性
5. 產出技術設計文件

請提供架構圖、數據流程圖、API 規格等，並說明技術選型的理由。`,
        suggested_tasks: ['設計系統架構', '規劃資料庫結構', '定義 API 介面'],
        color: '#8B5CF6',
        icon: 'cube',
        sort_order: 2
      },
      {
        name: '程式實作',
        description: '根據設計實作功能程式碼',
        system_prompt: `你是一位資深的全端工程師。請根據技術設計文件實作功能。

你的任務包括：
1. 編寫高品質、可維護的程式碼
2. 遵循最佳實踐和設計模式
3. 實作錯誤處理和輸入驗證
4. 編寫適當的註解和文件
5. 考慮程式碼的性能和安全性

請遵循專案的程式碼規節，並確保程式碼的可讀性和可測試性。`,
        suggested_tasks: ['實作功能模組', '編寫 API 端點', '開發前端介面'],
        color: '#10B981',
        icon: 'code',
        sort_order: 3
      },
      {
        name: '測試驗證',
        description: '測試功能並驗證品質',
        system_prompt: `你是一位專業的 QA 工程師。請為實作的功能設計和執行測試。

你的任務包括：
1. 設計測試案例和測試場景
2. 執行功能測試和邊界測試
3. 檢查程式碼品質和潛在問題
4. 驗證是否符合需求規格
5. 產出測試報告和改進建議

請使用系統化的測試方法，確保功能的正確性和穩定性。`,
        suggested_tasks: ['編寫測試案例', '執行功能測試', '性能測試'],
        color: '#F59E0B',
        icon: 'check-circle',
        sort_order: 4
      },
      {
        name: '文件撰寫',
        description: '撰寫技術文件和使用說明',
        system_prompt: `你是一位技術文件專家。請為專案撰寫清晰的文件。

你的任務包括：
1. 撰寫 API 文件和使用說明
2. 編寫安裝和部署指南
3. 創建使用教學和範例
4. 整理常見問題和疑難排解
5. 維護變更日誌和版本說明

請使用清晰、簡潔的語言，並提供充足的範例和圖示。`,
        suggested_tasks: ['撰寫 API 文件', '編寫使用指南', '整理 FAQ'],
        color: '#6B7280',
        icon: 'document-text',
        sort_order: 5
      }
    ];

    // Create all default stages
    for (const stageData of defaultStages) {
      await this.repository.create(stageData);
    }

    console.log('Default workflow stages initialized');
  }
}