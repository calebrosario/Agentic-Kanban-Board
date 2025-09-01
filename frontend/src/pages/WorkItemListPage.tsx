import React, { useEffect, useState } from 'react';
import { Plus, Briefcase, RefreshCw } from 'lucide-react';
import { useWorkItemStore } from '../stores/workItemStore';
import { useWorkflowStageStore } from '../stores/workflowStageStore';
import toast from 'react-hot-toast';
import { WorkItemCard } from '../components/WorkItem/WorkItemCard';
import { CreateWorkItemDialog } from '../components/WorkItem/CreateWorkItemDialog';
import { EditWorkItemDialog } from '../components/WorkItem/EditWorkItemDialog';
import { WorkItemStatus, WorkItem } from '../types/workitem';
import { SearchBar } from '../components/Common/SearchBar';

export const WorkItemListPage: React.FC = () => {
  const {
    workItems,
    stats,
    loading,
    error,
    fetchWorkItems,
    fetchStats,
    updateWorkItem,
    deleteWorkItem,
    clearError
  } = useWorkItemStore();
  
  const { fetchStages } = useWorkflowStageStore();
  
  const [statusFilter, setStatusFilter] = useState<WorkItemStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorkItem, setEditingWorkItem] = useState<WorkItem | null>(null);

  useEffect(() => {
    // 初始載入
    loadData();
    fetchStages();
  }, []);

  useEffect(() => {
    // 當篩選條件改變時重新載入
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    const status = statusFilter === 'all' ? undefined : statusFilter;
    await Promise.all([
      fetchWorkItems(status),
      fetchStats()
    ]);
  };

  const handleStatusChange = async (workItemId: string, status: WorkItemStatus) => {
    try {
      await updateWorkItem(workItemId, { 
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : undefined
      });
      await fetchStats();
      
      // 顯示成功提示
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

  const handleDelete = async (workItemId: string) => {
    if (window.confirm('確定要刪除這個 Work Item 嗎？相關的 Sessions 不會被刪除。')) {
      try {
        await deleteWorkItem(workItemId);
        await fetchStats();
        toast.success('Work Item 已刪除');
      } catch (err) {
        console.error('Failed to delete work item:', err);
        toast.error('刪除 Work Item 失敗');
      }
    }
  };

  const handleWorkItemCreated = () => {
    loadData();
    toast.success('Work Item 已建立');
  };

  const handleEdit = (workItem: WorkItem) => {
    setEditingWorkItem(workItem);
    setEditDialogOpen(true);
  };

  const handleWorkItemUpdated = () => {
    loadData();
    setEditDialogOpen(false);
    setEditingWorkItem(null);
    toast.success('Work Item 已更新');
  };

  // 搜尋過濾
  const filteredWorkItems = workItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusTabs = [
    { value: 'all', label: '全部', count: stats?.total },
    { value: 'planning', label: '規劃中', count: stats?.planning },
    { value: 'in_progress', label: '進行中', count: stats?.in_progress },
    { value: 'completed', label: '已完成', count: stats?.completed },
    { value: 'cancelled', label: '已取消', count: stats?.cancelled }
  ];

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Work Items</h1>
            {stats && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                總計 {stats.total}
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              新增 Work Item
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
            <span className="text-red-700">{error}</span>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {statusTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value as WorkItemStatus | 'all')}
                  className={`
                    px-6 py-3 border-b-2 font-medium text-sm transition-colors
                    ${statusFilter === tab.value
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-4">
            <SearchBar
              placeholder="搜尋 Work Items..."
              onSearch={setSearchQuery}
              defaultValue={searchQuery}
              className="w-full"
            />
          </div>
        </div>

        {/* Content */}
        {loading && !workItems.length ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredWorkItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-16 text-center">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? '沒有找到符合條件的 Work Items' : '還沒有 Work Items'}
            </h3>
            <p className="text-gray-500 mb-6">
              Work Items 幫助您組織和追蹤相關的 Sessions
            </p>
            {!searchQuery && (
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                創建第一個 Work Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkItems.map(workItem => (
              <WorkItemCard
                key={workItem.work_item_id}
                workItem={workItem}
                onEdit={handleEdit}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <CreateWorkItemDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onCreated={handleWorkItemCreated}
        />

        {/* Edit Dialog */}
        <EditWorkItemDialog
          open={editDialogOpen}
          workItem={editingWorkItem}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingWorkItem(null);
          }}
          onUpdated={handleWorkItemUpdated}
        />

        {/* Floating Action Button for mobile */}
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};