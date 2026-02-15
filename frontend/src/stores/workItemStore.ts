import { create } from 'zustand';
import { workItemApi } from '../services/workItemApi';
import { WorkItem, CreateWorkItemRequest, UpdateWorkItemRequest, WorkItemStats } from '../types/workitem';

interface WorkItemStore {
  workItems: WorkItem[];
  currentWorkItem: WorkItem | null;
  stats: WorkItemStats | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchWorkItems: (status?: string, projectId?: string) => Promise<void>;
  fetchWorkItem: (workItemId: string) => Promise<void>;
  createWorkItem: (data: CreateWorkItemRequest) => Promise<WorkItem>;
  updateWorkItem: (workItemId: string, data: UpdateWorkItemRequest) => Promise<WorkItem>;
  deleteWorkItem: (workItemId: string) => Promise<void>;
  updateStages: (workItemId: string, plannedStages: string[]) => Promise<void>;
  setCurrentStage: (workItemId: string, currentStage: string) => Promise<void>;
  associateSession: (sessionId: string, workItemId: string) => Promise<void>;
  disassociateSession: (sessionId: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearError: () => void;
  setCurrentWorkItem: (workItem: WorkItem | null) => void;
}

export const useWorkItemStore = create<WorkItemStore>((set, get) => ({
  workItems: [],
  currentWorkItem: null,
  stats: null,
  loading: false,
  error: null,

  fetchWorkItems: async (status?: string, projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const workItems = await workItemApi.list(status, projectId);
      set({ workItems, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch work items',
        loading: false 
      });
    }
  },

  fetchWorkItem: async (workItemId: string) => {
    set({ loading: true, error: null });
    try {
      const workItem = await workItemApi.get(workItemId);
      set({ currentWorkItem: workItem, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch work item',
        loading: false 
      });
    }
  },

  createWorkItem: async (data: CreateWorkItemRequest) => {
    set({ loading: true, error: null });
    try {
      const newWorkItem = await workItemApi.create(data);
      set(state => ({
        workItems: [...state.workItems, newWorkItem],
        loading: false
      }));
      return newWorkItem;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create work item',
        loading: false 
      });
      throw error;
    }
  },

  updateWorkItem: async (workItemId: string, data: UpdateWorkItemRequest) => {
    set({ loading: true, error: null });
    try {
      const updatedWorkItem = await workItemApi.update(workItemId, data);
      set(state => ({
        workItems: state.workItems.map(item => 
          item.work_item_id === workItemId ? updatedWorkItem : item
        ),
        currentWorkItem: state.currentWorkItem?.work_item_id === workItemId 
          ? updatedWorkItem 
          : state.currentWorkItem,
        loading: false
      }));
      return updatedWorkItem;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update work item',
        loading: false 
      });
      throw error;
    }
  },

  deleteWorkItem: async (workItemId: string) => {
    set({ loading: true, error: null });
    try {
      await workItemApi.delete(workItemId);
      set(state => ({
        workItems: state.workItems.filter(item => item.work_item_id !== workItemId),
        currentWorkItem: state.currentWorkItem?.work_item_id === workItemId 
          ? null 
          : state.currentWorkItem,
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete work item',
        loading: false 
      });
      throw error;
    }
  },

  updateStages: async (workItemId: string, plannedStages: string[]) => {
    set({ loading: true, error: null });
    try {
      const updatedWorkItem = await workItemApi.updateStages(workItemId, plannedStages);
      set(state => ({
        workItems: state.workItems.map(item => 
          item.work_item_id === workItemId ? updatedWorkItem : item
        ),
        currentWorkItem: state.currentWorkItem?.work_item_id === workItemId 
          ? updatedWorkItem 
          : state.currentWorkItem,
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update stages',
        loading: false 
      });
      throw error;
    }
  },

  setCurrentStage: async (workItemId: string, currentStage: string) => {
    set({ loading: true, error: null });
    try {
      const updatedWorkItem = await workItemApi.setCurrentStage(workItemId, currentStage);
      set(state => ({
        workItems: state.workItems.map(item => 
          item.work_item_id === workItemId ? updatedWorkItem : item
        ),
        currentWorkItem: state.currentWorkItem?.work_item_id === workItemId 
          ? updatedWorkItem 
          : state.currentWorkItem,
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to set current stage',
        loading: false 
      });
      throw error;
    }
  },

  associateSession: async (sessionId: string, workItemId: string) => {
    set({ loading: true, error: null });
    try {
      await workItemApi.associateSession(sessionId, workItemId);
      // Refresh the current work item to get updated sessions
      if (get().currentWorkItem?.work_item_id === workItemId) {
        await get().fetchWorkItem(workItemId);
      }
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to associate session',
        loading: false 
      });
      throw error;
    }
  },

  disassociateSession: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      await workItemApi.disassociateSession(sessionId);
      // Refresh the current work item if it has this session
      const currentWorkItem = get().currentWorkItem;
      if (currentWorkItem?.sessions?.some(s => s.session_id === sessionId)) {
        await get().fetchWorkItem(currentWorkItem.work_item_id);
      }
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to disassociate session',
        loading: false 
      });
      throw error;
    }
  },

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await workItemApi.getStats();
      set({ stats, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        loading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
  
  setCurrentWorkItem: (workItem: WorkItem | null) => set({ currentWorkItem: workItem })
}));