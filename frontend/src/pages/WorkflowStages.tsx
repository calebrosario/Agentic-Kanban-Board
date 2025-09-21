import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Workflow,
  ListTodo,
  Palette,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { workflowStageService, WorkflowStage } from '../services/workflowStageService';
import { agentPromptService, AgentListItem } from '../services/agentPromptService';
import toast from 'react-hot-toast';

export const WorkflowStages: React.FC = () => {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<WorkflowStage>>({});
  
  // Agent 相關狀態
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [promptSource, setPromptSource] = useState<'custom' | 'agent'>('custom');
  const [agentError, setAgentError] = useState<string>('');
  const [isAgentConfigured, setIsAgentConfigured] = useState(false);

  useEffect(() => {
    loadStages();
    loadAgentConfig();
  }, []);

  const loadAgentConfig = async () => {
    try {
      const config = await agentPromptService.getConfig();
      setIsAgentConfigured(config.configured);
      if (config.configured) {
        const agentList = await agentPromptService.listAgents();
        setAgents(agentList);
      }
    } catch (error) {
      console.error('Failed to load agent config:', error);
    }
  };

  const loadStages = async () => {
    try {
      setLoading(true);
      const data = await workflowStageService.getAllStages();
      setStages(data);
    } catch (error) {
      toast.error('載入工作流程階段失敗');
      console.error('Failed to load workflow stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setPromptSource('custom');
    setAgentError('');
    setFormData({
      name: '',
      description: '',
      system_prompt: '',
      agent_ref: '',
      suggested_tasks: [],
      color: '#8B5CF6',
      icon: 'workflow',
      is_active: true
    });
  };

  const handleEdit = (stage: WorkflowStage) => {
    setEditingStage(stage.stage_id);
    setPromptSource(stage.agent_ref ? 'agent' : 'custom');
    setAgentError('');
    setFormData({
      ...stage,
      suggested_tasks: stage.suggested_tasks || []
    });
  };

  // Agent 驗證邏輯
  const validateAgent = async (agentName: string): Promise<boolean> => {
    if (!agentName) return true;
    
    try {
      const exists = await workflowStageService.checkAgentExists(agentName);
      if (!exists) {
        setAgentError(`Agent "${agentName}" 檔案不存在！請檢查 .claude 路徑設定或選擇其他 Agent。`);
        return false;
      }
      setAgentError('');
      return true;
    } catch (error) {
      setAgentError('驗證 Agent 時發生錯誤');
      return false;
    }
  };

  const handlePromptSourceChange = (source: 'custom' | 'agent') => {
    setPromptSource(source);
    setAgentError('');
    
    if (source === 'agent') {
      // 切換到 Agent 模式時，清空自訂提示詞，保留 agent_ref
      setFormData(prev => ({ 
        ...prev, 
        system_prompt: '' 
      }));
    } else {
      // 切換到自訂模式時，清空 agent_ref
      setFormData(prev => ({ 
        ...prev, 
        agent_ref: '' 
      }));
    }
  };

  const handleAgentChange = async (agentName: string) => {
    setFormData(prev => ({ ...prev, agent_ref: agentName }));
    
    if (agentName) {
      await validateAgent(agentName);
    } else {
      setAgentError('');
    }
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        // 驗證必要欄位
        if (!formData.name) {
          toast.error('請填寫階段名稱');
          return;
        }

        // 根據提示詞來源驗證
        if (promptSource === 'custom') {
          if (!formData.system_prompt) {
            toast.error('請填寫自訂提示詞');
            return;
          }
        } else {
          if (!formData.agent_ref) {
            toast.error('請選擇 Agent');
            return;
          }
          
          // 驗證 Agent 存在性
          const agentValid = await validateAgent(formData.agent_ref);
          if (!agentValid) {
            return;
          }
        }

        // 如果有 Agent 錯誤，阻止儲存
        if (agentError) {
          toast.error('請先解決 Agent 設定問題');
          return;
        }
        await workflowStageService.createStage({
          name: formData.name!,
          description: formData.description,
          system_prompt: promptSource === 'custom' ? formData.system_prompt! : '',
          agent_ref: promptSource === 'agent' ? formData.agent_ref : '',
          suggested_tasks: formData.suggested_tasks,
          color: formData.color,
          icon: formData.icon
        });
        toast.success('工作流程階段建立成功');
      } else if (editingStage) {
        // 同樣的驗證邏輯
        if (!formData.name) {
          toast.error('請填寫階段名稱');
          return;
        }

        if (promptSource === 'custom') {
          if (!formData.system_prompt) {
            toast.error('請填寫自訂提示詞');
            return;
          }
        } else {
          if (!formData.agent_ref) {
            toast.error('請選擇 Agent');
            return;
          }
          
          const agentValid = await validateAgent(formData.agent_ref);
          if (!agentValid) {
            return;
          }
        }

        if (agentError) {
          toast.error('請先解決 Agent 設定問題');
          return;
        }

        await workflowStageService.updateStage(editingStage, {
          name: formData.name,
          description: formData.description,
          system_prompt: promptSource === 'custom' ? formData.system_prompt! : '',
          agent_ref: promptSource === 'agent' ? formData.agent_ref : '',
          suggested_tasks: formData.suggested_tasks,
          color: formData.color,
          icon: formData.icon,
          is_active: formData.is_active
        });
        toast.success('工作流程階段更新成功');
      }
      setIsCreating(false);
      setEditingStage(null);
      setFormData({});
      setAgentError('');
      loadStages();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '操作失敗';
      toast.error(errorMessage);
      console.error('Failed to save stage:', error);
      
      // 如果是 Agent 相關錯誤，顯示在 agentError 中
      if (errorMessage.includes('Agent') && errorMessage.includes('不存在')) {
        setAgentError(errorMessage);
      }
    }
  };

  const handleDelete = async (stageId: string) => {
    if (!confirm('確定要刪除這個工作流程階段嗎？')) {
      return;
    }
    try {
      await workflowStageService.deleteStage(stageId);
      toast.success('工作流程階段已刪除');
      loadStages();
    } catch (error) {
      toast.error('刪除失敗');
      console.error('Failed to delete workflow stage:', error);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingStage(null);
    setFormData({});
  };

  const handleTaskChange = (index: number, value: string) => {
    const tasks = [...(formData.suggested_tasks || [])];
    tasks[index] = value;
    setFormData({ ...formData, suggested_tasks: tasks });
  };

  const addTask = () => {
    const tasks = [...(formData.suggested_tasks || []), ''];
    setFormData({ ...formData, suggested_tasks: tasks });
  };

  const removeTask = (index: number) => {
    const tasks = (formData.suggested_tasks || []).filter((_, i) => i !== index);
    setFormData({ ...formData, suggested_tasks: tasks });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-blue">
              <Workflow className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              工作流程階段管理
            </h1>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 btn-primary"
          >
            <Plus className="w-4 h-4" />
            新增階段
          </button>
        </div>

        {/* 新增表單 - 玻璃卡片 */}
        {isCreating && (
          <div className="glass-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">新增工作流程階段</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名稱 *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="例如：需求分析"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  placeholder="簡短描述這個階段的目的"
                />
              </div>
              {/* 提示詞來源選擇 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  提示詞來源 *
                </label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="custom"
                      checked={promptSource === 'custom'}
                      onChange={() => handlePromptSourceChange('custom')}
                      className="mr-2"
                    />
                    <span className="text-sm">自訂提示詞</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="agent"
                      checked={promptSource === 'agent'}
                      onChange={() => handlePromptSourceChange('agent')}
                      disabled={!isAgentConfigured}
                      className="mr-2"
                    />
                    <span className={`text-sm ${!isAgentConfigured ? 'text-gray-400' : ''}`}>
                      使用 Agent
                    </span>
                    {!isAgentConfigured && (
                      <span className="ml-2 text-xs text-gray-500">
                        (請先設定 Agent 路徑)
                      </span>
                    )}
                  </label>
                </div>

                {/* 根據選擇顯示不同的輸入界面 */}
                {promptSource === 'custom' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      系統提示詞 (System Prompt) *
                    </label>
                    <textarea
                      value={formData.system_prompt || ''}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      rows={4}
                      className="input"
                      placeholder="定義 AI Agent 在這個階段的行為和角色..."
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      選擇 Agent *
                    </label>
                    <select
                      value={formData.agent_ref || ''}
                      onChange={(e) => handleAgentChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        agentError ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">選擇一個 Agent...</option>
                      {agents.map(agent => (
                        <option key={agent.name} value={agent.name}>
                          {agent.name} ({agent.fileName})
                        </option>
                      ))}
                    </select>
                    
                    {/* Agent 錯誤提示 */}
                    {agentError && (
                      <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-400 rounded">
                        <div className="flex">
                          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                          <div className="ml-3">
                            <p className="text-sm text-red-700">{agentError}</p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => window.location.href = '/agent-prompts'}
                                className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                              >
                                檢查 Agent 設定
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePromptSourceChange('custom')}
                                className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded hover:bg-gray-200"
                              >
                                改用自訂提示詞
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 顯示當前 Agent */}
                    {formData.agent_ref && !agentError && (
                      <p className="mt-2 text-sm text-gray-600">
                        <FileText className="inline w-4 h-4 mr-1" />
                        將使用{' '}
                        <a
                          href={`/agent-prompts/${formData.agent_ref}`}
                          className="bg-gray-100 px-1 py-0.5 rounded hover:bg-gray-200 text-blue-600 hover:underline"
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = `/agent-prompts/${formData.agent_ref}`;
                          }}
                        >
                          {formData.agent_ref}.md
                        </a>
                        {' '}的提示詞
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Palette className="inline w-4 h-4 mr-1" />
                  顏色
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <ListTodo className="inline w-4 h-4 mr-1" />
                  建議任務
                </label>
                <div className="space-y-2">
                  {(formData.suggested_tasks || []).map((task, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={task}
                        onChange={(e) => handleTaskChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="輸入建議任務..."
                      />
                      <button
                        onClick={() => removeTask(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addTask}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 新增建議任務
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleCancel}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 btn-primary"
              >
                <Save className="w-4 h-4" />
                儲存
              </button>
            </div>
          </div>
        )}
        

        {/* 階段列表 - 玻璃卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <div
              key={stage.stage_id}
              className="glass-card rounded-xl p-6 hover:shadow-soft-md transition-all duration-200 hover:-translate-y-1"
            >
              {editingStage === stage.stage_id ? (
                // 編輯模式
                <div className="space-y-4">
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input font-semibold"
                  />
                  {/* 簡化的提示詞選擇 */}
                  {promptSource === 'agent' ? (
                    <div>
                      <select
                        value={formData.agent_ref || ''}
                        onChange={(e) => handleAgentChange(e.target.value)}
                        className="input text-sm"
                      >
                        <option value="">選擇 Agent...</option>
                        {agents.map(agent => (
                          <option key={agent.name} value={agent.name}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                      {agentError && (
                        <p className="mt-1 text-xs text-red-600">{agentError}</p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={formData.system_prompt || ''}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      rows={3}
                      className="input text-sm"
                    />
                  )}
                  <div className="flex justify-end">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all hover:shadow-soft-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:shadow-blue transition-all"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                // 顯示模式
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {stage.name}
                      </h3>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(stage)}
                        className="p-1.5 text-gray-600 hover:bg-white/60 rounded-lg transition-all hover:shadow-soft-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(stage.stage_id)}
                        className="p-1.5 text-danger-600 hover:bg-danger-50 rounded-lg transition-all hover:shadow-soft-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {stage.description && (
                    <p className="text-sm text-gray-600 mb-3">{stage.description}</p>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-medium text-gray-500">
                        {stage.agent_ref ? '使用 Agent' : '系統提示詞'}
                      </span>
                      {stage.agent_ref ? (
                        <div className="mt-1 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <a
                            href={`/agent-prompts/${stage.agent_ref}`}
                            className="text-sm bg-primary-50 text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-100 transition-all hover:shadow-soft-sm cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              window.location.href = `/agent-prompts/${stage.agent_ref}`;
                            }}
                          >
                            {stage.agent_ref}.md
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 mt-1 line-clamp-3">
                          {stage.system_prompt}
                        </p>
                      )}
                    </div>
                    
                    {stage.suggested_tasks && stage.suggested_tasks.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-500">建議任務</span>
                        <ul className="text-sm text-gray-700 mt-1 space-y-1">
                          {stage.suggested_tasks.map((task, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end text-xs text-gray-500">
                      <div
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          stage.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {stage.is_active ? '啟用' : '停用'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};