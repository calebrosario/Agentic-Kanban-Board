export interface WorkItem {
  work_item_id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  project_id?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export enum WorkItemStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
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
  project_id?: string;
}

export interface WorkItemWithSessions extends WorkItem {
  sessions?: any[];  // Will be populated with Session objects
  progress?: {
    completed: number;
    total: number;
  };
}