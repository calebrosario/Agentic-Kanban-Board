import React, { useState } from 'react';
import { X, MessageSquare, Home, Code, FolderOpen, ShieldOff } from 'lucide-react';
import { useSessions } from '../../hooks/useSessions';
import { useSettings } from '../../hooks/useSettings';
import { CreateSessionRequest } from '../../types/session.types';
import toast from 'react-hot-toast';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    workingDir: '',
    task: '',
    continueChat: false,
    dangerouslySkipPermissions: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createSession } = useSessions();
  const { commonPaths } = useSettings();
  
  // 移除不再使用的 continuableSessions（現在使用 --continue 參數）

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
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
      };

      await createSession(request);
      
      toast.success('Session 建立成功！');
      
      // 重置表單
      setFormData({
        name: '',
        workingDir: '',
        task: '',
        continueChat: false,
        dangerouslySkipPermissions: false,
      });
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal 標題 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">建立新 Session</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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