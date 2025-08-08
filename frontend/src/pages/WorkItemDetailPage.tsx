import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Briefcase, 
  Plus, 
  Clock, 
  Play, 
  CheckCircle, 
  XCircle,
  Trash2,
  Calendar,
  Edit2,
  FileText,
  Download,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useWorkItemStore } from '../stores/workItemStore';
import { useSessions } from '../hooks/useSessions';
import { SessionCard } from '../components/Session/SessionCard';
import { CreateSessionModal } from '../components/Session/CreateSessionModal';
import { EditWorkItemDialog } from '../components/WorkItem/EditWorkItemDialog';
import { WorkItemStatus } from '../types/workitem';
import toast from 'react-hot-toast';
import { workItemApi } from '../services/workItemApi';

export const WorkItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    currentWorkItem, 
    fetchWorkItem, 
    updateWorkItem, 
    deleteWorkItem 
  } = useWorkItemStore();
  const { sessions, loadSessions } = useSessions();
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showDevMd, setShowDevMd] = useState(true); // 預設顯示
  const [devMdContent, setDevMdContent] = useState<string>('');
  const [loadingDevMd, setLoadingDevMd] = useState(false);
  
  // 從 localStorage 讀取 dev.md 側邊欄狀態
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('devMdSidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // 切換側邊欄狀態並保存到 localStorage
  const toggleDevMdSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('devMdSidebarCollapsed', JSON.stringify(newState));
  };

  useEffect(() => {
    if (id) {
      loadWorkItem();
      // 自動載入 dev.md
      loadDevMd();
    }
  }, [id]);

  useEffect(() => {
    // 每次 sessions 更新時重新載入
    loadSessions();
  }, []);

  // 處理 session 查詢參數
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId) {
      setSelectedSessionId(sessionId);
      // 導航到 Session 詳細頁面，但保持 Work Item 的返回連結
      navigate(`/sessions/${sessionId}?from=work-item&workItemId=${id}`, { replace: true });
    }
  }, [searchParams, navigate, id]);

  const loadWorkItem = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await fetchWorkItem(id);
    } finally {
      setLoading(false);
    }
  };

  // 過濾出屬於這個 Work Item 的 Sessions
  const workItemSessions = sessions.filter(s => s.work_item_id === id);

  const handleStatusChange = async (status: WorkItemStatus) => {
    if (!id) return;
    try {
      await updateWorkItem(id, { 
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : undefined
      });
      
      const statusText: Record<string, string> = {
        'planning': '已設為規劃中',
        'in_progress': '已開始執行',
        'completed': '已標記完成',
        'cancelled': '已取消'
      };
      toast.success(`Work Item ${statusText[status] || '狀態已更新'}`);
    } catch (err) {
      console.error('Failed to update work item status:', err);
      toast.error('更新狀態失敗');
    }
  };


  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('確定要刪除這個 Work Item 嗎？相關的 Sessions 不會被刪除，但會解除關聯。')) {
      try {
        await deleteWorkItem(id);
        toast.success('Work Item 已刪除');
        navigate('/work-items');
      } catch (err) {
        console.error('Failed to delete work item:', err);
        toast.error('刪除 Work Item 失敗');
      }
    }
  };

  const loadDevMd = async () => {
    if (!id) return;
    
    setLoadingDevMd(true);
    try {
      const content = await workItemApi.getDevMd(id);
      setDevMdContent(content);
      setShowDevMd(true);
    } catch (err) {
      console.error('Failed to load dev.md:', err);
      toast.error('載入 dev.md 失敗');
    } finally {
      setLoadingDevMd(false);
    }
  };

  const downloadDevMd = () => {
    if (!devMdContent || !currentWorkItem) return;
    
    const blob = new Blob([devMdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentWorkItem.title}-dev.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('dev.md 已下載');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentWorkItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Briefcase className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-medium text-gray-900 mb-2">找不到 Work Item</h2>
        <button
          onClick={() => navigate('/work-items')}
          className="text-blue-600 hover:text-blue-700"
        >
          返回列表
        </button>
      </div>
    );
  }

  const statusConfig = {
    planning: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100', label: '規劃中' },
    in_progress: { icon: Play, color: 'text-blue-500', bg: 'bg-blue-100', label: '進行中' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100', label: '已完成' },
    cancelled: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: '已取消' }
  };


  const status = statusConfig[currentWorkItem.status];
  const StatusIcon = status.icon;

  // 計算進度
  const completedSessions = workItemSessions.filter(s => s.status === 'completed').length;
  const progress = workItemSessions.length > 0 
    ? Math.round((completedSessions / workItemSessions.length) * 100)
    : 0;

  return (
    <div className="flex-1 bg-gray-50">
      <div className="flex h-full">
        {/* 主內容區 */}
        <div className={`flex-1 px-2 sm:px-3 lg:px-4 py-2 transition-all duration-300 ${sidebarCollapsed ? 'mr-12' : 'mr-96'}`}>
        {/* Header */}
        <div className="mb-3">
          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => navigate('/work-items')}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="text-xs">返回</span>
                  </button>
                  <span className="text-gray-300">|</span>
                  <Briefcase className="w-4 h-4 text-gray-400" />
                  <h1 className="text-lg font-bold text-gray-900">{currentWorkItem.title}</h1>
                </div>
                
                {currentWorkItem.description && (
                  <p className="text-xs text-gray-600 mb-1 line-clamp-1 ml-20">{currentWorkItem.description}</p>
                )}
                
                {currentWorkItem.workspace_path && (
                  <p className="text-xs text-gray-500 mb-1 ml-20">
                    📁 {currentWorkItem.workspace_path}
                  </p>
                )}

                {/* Badges and Meta Info in one line */}
                <div className="flex flex-wrap items-center gap-2 text-sm ml-20">
                  {/* Status */}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>

                  {/* Progress */}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                    進度 {progress}%
                  </span>
                  
                  {/* Meta Info inline */}
                  <span className="text-gray-500 flex items-center gap-1 text-xs">
                    <Calendar className="w-3 h-3" />
                    創建於 {formatDistanceToNow(new Date(currentWorkItem.created_at), { locale: zhTW, addSuffix: true })}
                  </span>
                  {currentWorkItem.completed_at && (
                    <span className="text-green-600 text-xs">
                      完成於 {formatDistanceToNow(new Date(currentWorkItem.completed_at), { locale: zhTW, addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                {currentWorkItem.status === 'planning' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                  >
                    開始執行
                  </button>
                )}
                {currentWorkItem.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                  >
                    標記完成
                  </button>
                )}
                <button
                  onClick={() => setEditDialogOpen(true)}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                  title="編輯"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="刪除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Sessions */}
        <div className="bg-white rounded-lg shadow p-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Sessions ({workItemSessions.length})
              </h2>
              <span className="text-xs text-gray-500">
                {completedSessions} 完成
              </span>
            </div>
            <button
              onClick={() => setCreateSessionOpen(true)}
              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs"
            >
              <Plus className="w-3 h-3" />
              新增
            </button>
          </div>

          {/* Progress Bar */}
          {workItemSessions.length > 0 && (
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Session List */}
          {workItemSessions.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-gray-400 mb-2">
                <Calendar className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-xs text-gray-500 mb-2">
                還沒有 Sessions
              </p>
              <button
                onClick={() => setCreateSessionOpen(true)}
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors inline-flex items-center gap-1 text-xs"
              >
                <Plus className="w-3 h-3" />
                創建第一個
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {workItemSessions.map((session, index) => (
                <div key={session.sessionId} className="w-full">
                  <SessionCard
                    session={session}
                    index={index}
                    onComplete={() => {}}
                    onInterrupt={() => {}}
                    onResume={() => {}}
                    onDelete={() => {}}
                    preserveWorkItemContext={true}
                    workItemId={id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Session Modal - 預設關聯到這個 Work Item */}
        {createSessionOpen && (
          <CreateSessionModal
            isOpen={createSessionOpen}
            onClose={() => {
              setCreateSessionOpen(false);
              loadSessions(); // 重新載入 sessions
              loadWorkItem(); // 重新載入 Work Item 以更新統計數據
            }}
            defaultWorkItemId={id}
          />
        )}

        {/* Edit Work Item Dialog */}
        <EditWorkItemDialog
          open={editDialogOpen}
          workItem={currentWorkItem}
          onClose={() => setEditDialogOpen(false)}
          onUpdated={() => {
            loadWorkItem();
            setEditDialogOpen(false);
            toast.success('Work Item 已更新');
          }}
        />
        </div>

        {/* 右側 dev.md 側邊欄 */}
        <div className={`fixed right-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-10 ${sidebarCollapsed ? 'w-12' : 'w-96'}`}>
          {/* 收合/展開按鈕 */}
          <button
            onClick={toggleDevMdSidebar}
            className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {/* dev.md 內容 */}
          {!sidebarCollapsed && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-sm font-semibold text-gray-900">開發日誌 (dev.md)</h2>
                <button
                  onClick={downloadDevMd}
                  className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                  title="下載 dev.md"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {loadingDevMd ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : devMdContent ? (
                  <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700">
                    {devMdContent}
                  </pre>
                ) : (
                  <div className="text-center text-gray-500 text-sm">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>dev.md 尚未建立</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 收合時的圖示 */}
          {sidebarCollapsed && (
            <div className="h-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};