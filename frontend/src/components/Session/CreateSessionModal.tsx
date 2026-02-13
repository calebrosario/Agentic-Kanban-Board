import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Code, ShieldOff, Workflow, Briefcase } from 'lucide-react';
import { useSessions } from '../../hooks/useSessions';
import { useSettings } from '../../hooks/useSettings';
import { useTaskTemplates } from '../../hooks/useTaskTemplates';
import { CreateSessionRequest, Session } from '../../types/session.types';
import { workflowStageService, WorkflowStage } from '../../services/workflowStageService';
import { useWorkItemStore } from '../../stores/workItemStore';
import toast from 'react-hot-toast';
import { useI18nContext } from '../../contexts/I18nContext';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWorkItemId?: string;
  prefillData?: Partial<CreateSessionRequest & { baseSessionName?: string }>;
  onCreated?: (session: Session) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  defaultWorkItemId,
  prefillData,
  onCreated,
}) => {
  const { t } = useI18nContext();
  const [formData, setFormData] = useState({
    name: '',
    workingDir: '',
    task: '',
    continueChat: false,
    dangerouslySkipPermissions: false,
    workflow_stage_id: '',
    work_item_id: defaultWorkItemId || '',
    ...prefillData,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workflowStages, setWorkflowStages] = useState<WorkflowStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<WorkflowStage | null>(null);
  
  const { createSession } = useSessions();
  const { commonPaths } = useSettings();
  const { workItems, fetchWorkItems } = useWorkItemStore();
  const { activeTemplates } = useTaskTemplates();
  
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
      const stages = await workflowStageService.getAllStages(true); // Load only active stages
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
      toast.error(t('session.create.errors.nameRequired'));
      return;
    }

    if (!formData.workingDir.trim()) {
      toast.error(t('session.create.errors.dirRequired'));
      return;
    }

    if (!formData.task.trim()) {
      toast.error(t('session.create.errors.taskRequired'));
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

      const newSession = await createSession(request);

      toast.success(t('session.create.toasts.created'));

      // Reset form, but keep Work Item ID and default path if any
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

      // 如果有回調函數，呼叫它
      if (onCreated && newSession) {
        onCreated(newSession);
      }
    } catch (error) {
      toast.error(t('session.create.toasts.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleQuickPathSelect = (path: string) => {
    setFormData(prev => ({ ...prev, workingDir: path }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900/70 via-purple-900/60 to-cyan-900/70 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="glass-extreme shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col rounded-2xl animate-slide-in-up border border-white/40 bg-white/15">
        {/* Modal 標題 */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 flex-shrink-0 bg-white/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-soft">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">{t('session.create.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-all hover:shadow-soft-sm glass-ultra border border-white/30"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Modal 內容 - 可滾動區域 */}
        <div className="flex-1 overflow-y-auto bg-white/15">
          {/* 預填提示 */}
          {prefillData && (
            <div className="mx-4 mt-4 p-3 glass-card rounded-lg border border-blue-200/50 bg-blue-50/10">
              <div className="flex items-center gap-2 text-blue-700 font-medium">
                <MessageSquare className="w-4 h-4" />
                <span>{t('session.create.prefillTitle', { baseSessionName: prefillData.baseSessionName || t('session.create.prefillPreviousConversation') })}</span>
              </div>
              <p className="text-blue-600 text-sm mt-1 opacity-90">
                {t('session.create.prefillDescription')}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-4 h-full flex flex-col">
            {/* 雙欄布局容器 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
              {/* 左欄：基本設定和關聯設定 */}
              <div className="space-y-4 overflow-y-auto">
                <div className="glass-card p-4 rounded-lg border border-white/40 bg-white/15">
                  <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-600" />
                    {t('session.create.basicSettings')}
                  </h3>

                  {/* Session 名稱 */}
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Session 名稱 *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder={t('session.create.namePlaceholderExample')}
                        className="w-full px-3 py-2 glass-ultra border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm bg-white/10"
                        required
                      />
                    </div>

                    {/* Working directory */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="workingDir" className="text-sm font-medium text-gray-700">
                          {t('session.create.workingDirRequired')}
                        </label>
                        <span className="text-xs text-gray-500">{t('session.create.workingDirHint')}</span>
                      </div>

                      {/* Common path quick selection */}
                      {commonPaths.length > 0 && (
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleQuickPathSelect(e.target.value);
                            }
                          }}
                          value=""
                          className="w-full px-3 py-2 glass-ultra border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm bg-white/10 text-sm mb-2"
                        >
                          <option value="">{t('session.create.selectCommonPath')}</option>
                          {commonPaths.map((pathOption) => {
                            const iconEmoji = pathOption.icon === 'Home' ? '🏠' : pathOption.icon === 'Code' ? '💻' : '📁';
                            return (
                              <option key={pathOption.id} value={pathOption.path}>
                                {iconEmoji} {pathOption.label}
                              </option>
                            );
                          })}
                        </select>
                      )}

                      {/* 路徑輸入 */}
                      <input
                        type="text"
                        id="workingDir"
                        name="workingDir"
                        value={formData.workingDir}
                        onChange={handleInputChange}
                        placeholder={t('session.create.workingDirPlaceholder')}
                        className="w-full px-3 py-2 glass-ultra border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm bg-white/10"
                        required
                      />

                      {/* Path hint */}
                      {formData.workingDir && (
                        <div className="mt-1.5 text-xs text-gray-600">
                          ✓ <span className="font-mono">{formData.workingDir}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Work Item 選擇 */}
                <div className="glass-card p-4 rounded-lg border border-white/40 bg-white/15">
                  <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    {t('session.create.workItemAssociation')}
                  </h3>

                  <div>
                    <label htmlFor="work_item_id" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('session.create.workItemLabel', { autoLinked: defaultWorkItemId ? t('session.create.autoLinked') : t('session.create.optional') })}
                    </label>
                    <select
                      id="work_item_id"
                      name="work_item_id"
                      value={formData.work_item_id}
                      onChange={handleInputChange}
                      disabled={!!defaultWorkItemId}
                      className={`w-full px-3 py-2 glass-ultra border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm bg-white/10 ${
                        defaultWorkItemId ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">{t('session.create.noWorkItem')}</option>
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
                      <div className="mt-2 p-3 glass-ultra rounded-lg border border-purple-200/50 bg-purple-50/10">
                        <div className="flex items-center space-x-1.5 mb-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-sm font-medium text-purple-900">{t('session.create.workItemInfo')}</span>
                        </div>
                        {(() => {
                          const selectedWorkItem = workItems.find(w => w.work_item_id === formData.work_item_id);
                          if (!selectedWorkItem) return null;
                          return (
                            <p className="text-sm text-purple-700">{selectedWorkItem.description || t('session.create.noDescription')}</p>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* 工作流程階段選擇 */}
                <div className="glass-card p-4 rounded-lg border border-white/40 bg-white/15">
                  <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-indigo-600" />
                    {t('session.create.workflowStage')}
                  </h3>

                  <div>
                    <label htmlFor="workflow_stage_id" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t('session.create.workflowStageLabel')}
                    </label>
                    <select
                      id="workflow_stage_id"
                      name="workflow_stage_id"
                      value={formData.workflow_stage_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 glass-ultra border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm bg-white/10"
                    >
                      <option value="">{t('session.create.noWorkflowStage')}</option>
                      {workflowStages.map(stage => (
                        <option key={stage.stage_id} value={stage.stage_id}>
                          {stage.name} - {stage.description}
                        </option>
                      ))}
                    </select>

                    {/* 顯示選中階段的建議任務 */}
                    {selectedStage && selectedStage.suggested_tasks && selectedStage.suggested_tasks.length > 0 && (
                      <div className="mt-2 p-3 glass-ultra rounded-lg border border-blue-200/50 bg-blue-50/10">
                        <div className="flex items-center space-x-1.5 mb-2">
                          <Workflow className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">{t('session.create.suggestedTasks')}</span>
                        </div>
                        <ul className="text-sm text-blue-700 space-y-1.5">
                          {selectedStage.suggested_tasks.map((task, index) => (
                            <li key={index} className="flex items-start gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0"></span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced options */}
                <div className="glass-card p-4 rounded-lg border border-white/40 bg-white/15">
                  <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <ShieldOff className="w-4 h-4 text-orange-600" />
                    {t('session.create.advancedOptions')}
                  </h3>

                  <div className="space-y-3">
                    {/* Continue chat option */}
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        id="continueChat"
                        name="continueChat"
                        checked={formData.continueChat}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor="continueChat" className="text-sm font-medium text-gray-700 flex-1">
                        {t('session.create.continueChat')}
                      </label>
                      <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    {formData.continueChat && (
                      <div className="text-xs text-gray-600 pl-7 p-2 bg-blue-50/50 rounded border border-blue-200/30">
                        💡 {t('session.create.continueChatHint')}
                      </div>
                    )}

                    {/* Skip permission check option */}
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        id="dangerouslySkipPermissions"
                        name="dangerouslySkipPermissions"
                        checked={formData.dangerouslySkipPermissions}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                      />
                      <label htmlFor="dangerouslySkipPermissions" className="text-sm font-medium text-gray-700 flex-1">
                        <span className="text-red-600 font-semibold">{t('session.create.dangerouslySkipPermissions')}</span>
                      </label>
                      <ShieldOff className="w-3.5 h-3.5 text-red-500" />
                    </div>
                    {formData.dangerouslySkipPermissions && (
                      <div className="text-xs text-red-700 pl-7 p-2.5 bg-red-50/50 rounded border border-red-200/50">
                        ⚠️ {t('session.create.dangerouslySkipPermissionsWarning')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column: task description area */}
              <div className="flex flex-col h-full">
                {/* 任務描述卡片 - 塞滿右側高度 */}
                <div className="glass-card p-4 rounded-lg border-2 border-green-200/60 bg-white/20 shadow-lg flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      </div>
                      {t('session.create.taskDescription')}
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{t('session.create.required')}</span>
                    </h3>
                  </div>

                  <div className="flex flex-col flex-1">
                    <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1.5 flex-shrink-0">
                      {t('session.create.taskContent')}
                    </label>
                    <div className="relative flex-1 flex flex-col">
                      <textarea
                        id="task"
                        name="task"
                        value={formData.task}
                        onChange={handleInputChange}
                        placeholder={t('session.create.taskPlaceholder')}
                        className="w-full h-full px-3 py-2.5 glass-ultra border border-white/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 focus:bg-white/35 bg-white/25 text-gray-800 placeholder-gray-500 leading-relaxed transition-colors duration-150 resize-none flex-1"
                        required
                      />
                      {/* Character count */}
                      <div className="absolute bottom-2 right-3 text-xs text-gray-500 bg-white/90 px-2 py-1 rounded">
                        {formData.task.length} {t('session.create.characters')}
                      </div>
                    </div>

                    {/* Quick task templates */}
                    <div className="mt-2 flex-shrink-0">
                      <div className="text-xs text-gray-600 font-medium mb-1.5">{t('session.create.quickTemplates')}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                              const currentTask = formData.task;
                              const newTask = currentTask ? `${currentTask}\n\n${template.template}` : template.template;
                              setFormData(prev => ({ ...prev, task: newTask }));
                            }}
                            title={template.template}
                            className="px-2.5 py-1.5 text-xs glass-ultra rounded-md border border-white/40 bg-white/15 hover:bg-white/25 font-bold transition-colors duration-150"
                          >
                            {template.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom buttons */}
            <div className="flex space-x-3 pt-4 border-t border-white/20 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 glass-ultra border border-white/40 text-gray-800 rounded-lg hover:bg-white/25 transition-all font-bold"
              >
                {t('session.create.cancelButton')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-soft font-bold"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-bold">{t('session.create.creating')}</span>
                  </div>
                ) : (
                  <span className="font-bold">{t('session.create.createButton')}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};