import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Workflow,
  Thermometer,
  ListTodo,
  Palette
} from 'lucide-react';
import { workflowStageService, WorkflowStage } from '../services/workflowStageService';
import toast from 'react-hot-toast';

export const WorkflowStages: React.FC = () => {
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<WorkflowStage>>({});

  useEffect(() => {
    loadStages();
  }, []);

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
    setFormData({
      name: '',
      description: '',
      system_prompt: '',
      temperature: 0.7,
      suggested_tasks: [],
      color: '#8B5CF6',
      icon: 'workflow',
      is_active: true
    });
  };

  const handleEdit = (stage: WorkflowStage) => {
    setEditingStage(stage.stage_id);
    setFormData({
      ...stage,
      suggested_tasks: stage.suggested_tasks || []
    });
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        if (!formData.name || !formData.system_prompt) {
          toast.error('請填寫必要欄位');
          return;
        }
        await workflowStageService.createStage({
          name: formData.name!,
          description: formData.description,
          system_prompt: formData.system_prompt!,
          temperature: formData.temperature,
          suggested_tasks: formData.suggested_tasks,
          color: formData.color,
          icon: formData.icon
        });
        toast.success('工作流程階段建立成功');
      } else if (editingStage) {
        await workflowStageService.updateStage(editingStage, {
          name: formData.name,
          description: formData.description,
          system_prompt: formData.system_prompt,
          temperature: formData.temperature,
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
      loadStages();
    } catch (error) {
      toast.error('儲存失敗');
      console.error('Failed to save workflow stage:', error);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Workflow className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">工作流程階段管理</h1>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增階段
          </button>
        </div>

        {/* 新增表單 */}
        {isCreating && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">新增工作流程階段</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名稱 *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="簡短描述這個階段的目的"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  系統提示詞 (System Prompt) *
                </label>
                <textarea
                  value={formData.system_prompt || ''}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="定義 AI Agent 在這個階段的行為和角色..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Thermometer className="inline w-4 h-4 mr-1" />
                  Temperature (0-2)
                </label>
                <input
                  type="number"
                  value={formData.temperature || 0.7}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  min="0"
                  max="2"
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Palette className="inline w-4 h-4 mr-1" />
                  顏色
                </label>
                <input
                  type="color"
                  value={formData.color || '#8B5CF6'}
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
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                儲存
              </button>
            </div>
          </div>
        )}

        {/* 階段列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <div
              key={stage.stage_id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {editingStage === stage.stage_id ? (
                // 編輯模式
                <div className="space-y-4">
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                  />
                  <textarea
                    value={formData.system_prompt || ''}
                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formData.temperature || 0.7}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      min="0"
                      max="2"
                      step="0.1"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Temperature"
                    />
                    <input
                      type="color"
                      value={formData.color || '#8B5CF6'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                // 顯示模式
                <>
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
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(stage.stage_id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
                      <span className="text-xs font-medium text-gray-500">系統提示詞</span>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-3">
                        {stage.system_prompt}
                      </p>
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
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Thermometer className="w-3 h-3" />
                        <span>Temperature: {stage.temperature}</span>
                      </div>
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
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};