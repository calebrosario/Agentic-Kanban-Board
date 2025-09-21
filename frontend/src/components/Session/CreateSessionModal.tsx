import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Home, Code, FolderOpen, ShieldOff, Workflow, Briefcase } from 'lucide-react';
import { useSessions } from '../../hooks/useSessions';
import { useSettings } from '../../hooks/useSettings';
import { CreateSessionRequest } from '../../types/session.types';
import { workflowStageService, WorkflowStage } from '../../services/workflowStageService';
import { useWorkItemStore } from '../../stores/workItemStore';
import toast from 'react-hot-toast';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWorkItemId?: string;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  defaultWorkItemId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    workingDir: '',
    task: '',
    continueChat: false,
    dangerouslySkipPermissions: false,
    workflow_stage_id: '',
    work_item_id: defaultWorkItemId || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  
  const { createSession } = useSessions();
  const { commonPaths } = useSettings();
  const { workItems, fetchWorkItems } = useWorkItemStore();
  
  // 移除不再使用的 continuableSessions（現在使用 --continue 參數）

  // 載入工作流程階段和 Work Items
  useEffect(() => {
    if (isOpen) {
      loadWorkflowStages();
      fetchWorkItems(); // 載入所有 Work Items
      
      // 如果有預設的 Work Item ID，確保它被設置並使用其 workspace_path
      if (defaultWorkItemId) {
        const workItem = workItems.find(w => w.work_item_id === defaultWorkItemId);
        setFormData(prev => ({ 
          ...prev, 
          work_item_id: defaultWorkItemId,
          // 使用 Work Item 的 workspace_path，如果沒有則使用預設路徑
          workingDir: prev.workingDir || workItem?.workspace_path || ''
        }));
      }
    }
  }, [isOpen, defaultWorkItemId, workItems]);

  const loadWorkflowStages = async () => {
    try {
      const stages = await workflowStageService.getAllStages(true); // 只載入活躍的階段
      setWorkflowStages(stages);
    } catch (error) {
      console.error('Failed to load workflow stages:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // 處理工作流程階段選擇
    if (name === 'workflow_stage_id') {
      const stage = workflowStages.find(s => s.stage_id === value);
      setSelectedStage(stage || null);
    }
    
    // 處理 Work Item 選擇 - 自動更新工作目錄
    if (name === 'work_item_id' && value) {
      const selectedWorkItem = workItems.find(w => w.work_item_id === value);
      if (selectedWorkItem?.workspace_path) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          workingDir: selectedWorkItem.workspace_path || prev.workingDir // 自動填入 Work Item 的工作區路徑
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('請輸入 Session 名稱');
      return;
    }
    
    if (!formData.workingDir.trim()) {
      toast.error('請輸入工作目錄');
      return;
    }
    
    if (!formData.task.trim()) {
      toast.error('請輸入任務描述');
      return;
    }

    setIsSubmitting(true);

    try {
      const request: CreateSessionRequest = {
        name: formData.name.trim(),
        workingDir: formData.workingDir.trim(),
        task: formData.task.trim(),
        continueChat: formData.continueChat,
        dangerouslySkipPermissions: formData.dangerouslySkipPermissions,
        workflow_stage_id: formData.workflow_stage_id || undefined,
        work_item_id: formData.work_item_id || undefined,
      };

      await createSession(request);
      
      toast.success('Session 建立成功！');
      
      // 重置表單，但保留 Work Item ID 和預設路徑如果有的話
      const workItem = defaultWorkItemId ? workItems.find(w => w.work_item_id === defaultWorkItemId) : null;
      setFormData({
        name: '',
        workingDir: workItem?.workspace_path || '',
        task: '',
        continueChat: false,
        dangerouslySkipPermissions: false,
        workflow_stage_id: '',
        work_item_id: defaultWorkItemId || '',
      });
      setSelectedStage(null);
      
      onClose();
    } catch (error) {
      toast.error('建立 Session 失敗');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleQuickPathSelect = (path: string) => {
    setFormData(prev => ({ ...prev, workingDir: path }));
  };

  // 圖示映射
  const iconMap = {
    FolderOpen,
    Code,
    Home,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card shadow-soft-lg max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col rounded-xl animate-slide-in-up">
        {/* Modal 標題 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">建立新 Session</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all hover:shadow-soft-sm"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal 內容 - 可滾動區域 */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Session 名稱 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Session 名稱 *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="例如：實作使用者登入功能"
              className="input"
              required
            />
          </div>

          {/* 工作目錄 */}
          <div>
            <label htmlFor="workingDir" className="block text-sm font-medium text-gray-700 mb-2">
              工作目錄 *
            </label>
            
            {/* 常用路徑快速選擇 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500">快速選擇：</div>
                <div className="text-xs text-blue-600 cursor-pointer hover:text-blue-700" 
                     title="在右上角設定按鈕中可以自定義常用路徑">
                  💡 可自定義
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {commonPaths.map((pathOption) => {
                  const IconComponent = iconMap[pathOption.icon];
                  return (
                    <button
                      key={pathOption.id}
                      type="button"
                      onClick={() => handleQuickPathSelect(pathOption.path)}
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg transition-all hover:shadow-soft-sm border border-gray-200"
                      title={pathOption.path}
                    >
                      <IconComponent className="w-3 h-3" />
                      <span>{pathOption.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* 路徑輸入和選擇按鈕 */}
            <div className="flex space-x-2">
              <input
                type="text"
                id="workingDir"
                name="workingDir"
                value={formData.workingDir}
                onChange={handleInputChange}
                placeholder="輸入工作目錄路徑..."
                className="flex-1 input"
                required
              />
              {/* <button
                type="button"
                onClick={handleFolderSelect}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                title="瀏覽資料夾路徑（不會上傳文件）"
              >
                <Folder className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
              </button> */}
            </div>
            
            
            {/* 路徑提示 */}
            {formData.workingDir && (
              <div className="mt-2 text-xs text-gray-500">
                已選擇：<span className="font-mono bg-gray-100 px-2 py-1 rounded">{formData.workingDir}</span>
              </div>
            )}
          </div>

          {/* Work Item 選擇 */}
          <div>
            <label htmlFor="work_item_id" className="block text-sm font-medium text-gray-700 mb-2">
              關聯 Work Item {defaultWorkItemId ? '(已自動關聯)' : '(選填)'}
            </label>
            <select
              id="work_item_id"
              name="work_item_id"
              value={formData.work_item_id}
              onChange={handleInputChange}
              disabled={!!defaultWorkItemId} // 如果有預設值就禁用選擇
              className={`input ${
                defaultWorkItemId ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">不關聯到 Work Item</option>
              {workItems
                .filter(item => item.status === 'planning' || item.status === 'in_progress' || item.work_item_id === defaultWorkItemId)
                .map(item => (
                  <option key={item.work_item_id} value={item.work_item_id}>
                    {item.title}
                  </option>
                ))
              }
            </select>
            
            {formData.work_item_id && (
              <div className="mt-2 p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Work Item 資訊：</span>
                </div>
                {(() => {
                  const selectedWorkItem = workItems.find(w => w.work_item_id === formData.work_item_id);
                  if (!selectedWorkItem) return null;
                  return (
                    <>
                      <p className="text-xs text-purple-700">{selectedWorkItem.description}</p>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 工作流程階段選擇 */}
          <div>
            <label htmlFor="workflow_stage_id" className="block text-sm font-medium text-gray-700 mb-2">
              工作流程階段 (選填)
            </label>
            <select
              id="workflow_stage_id"
              name="workflow_stage_id"
              value={formData.workflow_stage_id}
              onChange={handleInputChange}
              className="input"
            >
              <option value="">不使用工作流程階段</option>
              {workflowStages.map(stage => (
                <option key={stage.stage_id} value={stage.stage_id}>
                  {stage.name} - {stage.description}
                </option>
              ))}
            </select>
            
            {/* 顯示選中階段的建議任務 */}
            {selectedStage && selectedStage.suggested_tasks && selectedStage.suggested_tasks.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Workflow className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">建議的工作項目：</span>
                </div>
                <ul className="text-xs text-blue-700 space-y-1">
                  {selectedStage.suggested_tasks.map((task, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 任務描述 */}
          <div>
            <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
              任務描述 *
            </label>
            <textarea
              id="task"
              name="task"
              value={formData.task}
              onChange={handleInputChange}
              placeholder="請詳細描述你想要 Claude Code 幫你完成的任務..."
              rows={3}
              className="input resize-none"
              required
            />
          </div>

          {/* 繼續對話選項 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="continueChat"
                name="continueChat"
                checked={formData.continueChat}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="continueChat" className="text-sm text-gray-700">
                繼續最近的對話
              </label>
              <MessageSquare className="w-4 h-4 text-gray-400" />
            </div>

            {/* 說明文字 */}
            {formData.continueChat && (
              <div className="text-xs text-gray-500 pl-6">
                💡 將使用 Claude Code 的 --continue 參數延續最近的對話
              </div>
            )}

            {/* 跳過權限檢查選項 */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="dangerouslySkipPermissions"
                name="dangerouslySkipPermissions"
                checked={formData.dangerouslySkipPermissions}
                onChange={handleInputChange}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
              />
              <label htmlFor="dangerouslySkipPermissions" className="text-sm text-gray-700">
                <span className="text-red-600 font-medium">危險：跳過權限檢查</span>
              </label>
              <ShieldOff className="w-4 h-4 text-red-500" />
            </div>

            {/* 說明文字 */}
            {formData.dangerouslySkipPermissions && (
              <div className="text-xs text-red-600 pl-6 bg-red-50 p-2 rounded">
                ⚠️ 警告：這將允許 Claude Code 在沒有權限確認的情況下執行操作，可能會對您的系統造成意外的變更。僅在完全信任的環境中使用。
              </div>
            )}
          </div>

          {/* 提交按鈕 */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>建立中...</span>
                </div>
              ) : (
                '建立 Session'
              )}
            </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};