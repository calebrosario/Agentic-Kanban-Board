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
  Edit2
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

  useEffect(() => {
    if (id) {
      loadWorkItem();
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/work-items')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-6 h-6 text-gray-400" />
                  <h1 className="text-2xl font-bold text-gray-900">{currentWorkItem.title}</h1>
                </div>
                
                {currentWorkItem.description && (
                  <p className="text-gray-600 mb-4">{currentWorkItem.description}</p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {/* Status */}
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    {status.label}
                  </span>


                  {/* Progress */}
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-600">
                    進度 {progress}%
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {currentWorkItem.status === 'planning' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    開始執行
                  </button>
                )}
                {currentWorkItem.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    標記完成
                  </button>
                )}
                <button
                  onClick={() => setEditDialogOpen(true)}
                  className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="編輯"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="刪除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                創建於 {formatDistanceToNow(new Date(currentWorkItem.created_at), { locale: zhTW, addSuffix: true })}
              </div>
              {currentWorkItem.completed_at && (
                <div className="text-green-600">
                  完成於 {formatDistanceToNow(new Date(currentWorkItem.completed_at), { locale: zhTW, addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Sessions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                相關 Sessions ({workItemSessions.length})
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {completedSessions} 個已完成
              </p>
            </div>
            <button
              onClick={() => setCreateSessionOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增 Session
            </button>
          </div>

          {/* Progress Bar */}
          {workItemSessions.length > 0 && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Session List */}
          {workItemSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500 mb-4">
                這個 Work Item 還沒有相關的 Sessions
              </p>
              <button
                onClick={() => setCreateSessionOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                創建第一個 Session
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workItemSessions.map((session, index) => (
                <SessionCard
                  key={session.sessionId}
                  session={session}
                  index={index}
                  onComplete={() => {}}
                  onInterrupt={() => {}}
                  onResume={() => {}}
                  onDelete={() => {}}
                  preserveWorkItemContext={true}
                  workItemId={id}
                />
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
    </div>
  );
};