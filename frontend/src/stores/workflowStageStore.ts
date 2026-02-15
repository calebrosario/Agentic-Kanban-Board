import { create } from 'zustand';
import axiosInstance from '../utils/axiosInstance';

export interface WorkflowStage {
  stage_id: string;
  name: string;
  color?: string;
  icon?: string;
  system_prompt?: string;
  temperature?: number;
  suggested_tasks?: string[];
  sort_order?: number;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface WorkflowStageStore {
  stages: WorkflowStage[];
  loading: boolean;
  error: string | null;
  
  fetchStages: () => Promise<void>;
  createStage: (stage: Partial<WorkflowStage>) => Promise<WorkflowStage>;
  updateStage: (stageId: string, updates: Partial<WorkflowStage>) => Promise<void>;
  deleteStage: (stageId: string) => Promise<void>;
  clearError: () => void;
}

export const useWorkflowStageStore = create<WorkflowStageStore>((set) => ({
  stages: [],
  loading: false,
  error: null,

  fetchStages: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get<WorkflowStage[]>('/workflow-stages');
      set({ stages: response.data, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch workflow stages',
        loading: false 
      });
    }
  },

  createStage: async (stage: Partial<WorkflowStage>) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post<WorkflowStage>('/workflow-stages', stage);
      const newStage = response.data;
      set(state => ({
        stages: [...state.stages, newStage],
        loading: false
      }));
      return newStage;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create workflow stage',
        loading: false 
      });
      throw error;
    }
  },

  updateStage: async (stageId: string, updates: Partial<WorkflowStage>) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.put<WorkflowStage>(`/workflow-stages/${stageId}`, updates);
      const updatedStage = response.data;
      set(state => ({
        stages: state.stages.map(s => s.stage_id === stageId ? updatedStage : s),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update workflow stage',
        loading: false 
      });
      throw error;
    }
  },

  deleteStage: async (stageId: string) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`/workflow-stages/${stageId}`);
      set(state => ({
        stages: state.stages.filter(s => s.stage_id !== stageId),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete workflow stage',
        loading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));