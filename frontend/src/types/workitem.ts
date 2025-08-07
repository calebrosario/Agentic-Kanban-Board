export type WorkItemStatus = 'planning' | 'in_progress' | 'completed' | 'cancelled';

export interface WorkItem {
  work_item_id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  project_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  sessions?: Array<{
    session_id: string;
    name: string;
    status: string;
    workflow_stage_id?: string;
  }>;
  session_count?: number;
  completed_session_count?: number;
  progress?: number;
}

export interface CreateWorkItemRequest {
  title: string;
  description?: string;
  project_id?: string;
}

export interface UpdateWorkItemRequest {
  title?: string;
  description?: string;
  status?: WorkItemStatus;
  completed_at?: string;
}

export interface WorkItemStats {
  total: number;
  planning: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}