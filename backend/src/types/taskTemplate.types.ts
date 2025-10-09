export interface TaskTemplate {
  id: string;
  label: string;
  template: string;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskTemplateRequest {
  label: string;
  template: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateTaskTemplateRequest {
  label?: string;
  template?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReorderTaskTemplatesRequest {
  id: string;
  sort_order: number;
}