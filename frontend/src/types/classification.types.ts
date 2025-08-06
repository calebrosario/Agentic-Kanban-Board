// 專案相關類型
export interface Project {
  project_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

// 標籤相關類型
export interface Tag {
  tag_id: string;
  name: string;
  color?: string;
  type: 'general' | 'activity' | 'topic' | 'department';
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// 建立專案請求
export interface CreateProjectRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

// 建立標籤請求
export interface CreateTagRequest {
  name: string;
  color?: string;
  type?: 'general' | 'activity' | 'topic' | 'department';
}

// 更新專案請求
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: 'active' | 'completed' | 'archived';
}

// 更新標籤請求
export interface UpdateTagRequest {
  name?: string;
  color?: string;
  type?: 'general' | 'activity' | 'topic' | 'department';
}

// 專案統計
export interface ProjectStats {
  session_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}