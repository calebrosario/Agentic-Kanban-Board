import { ProjectRepository, Project } from '../repositories/ProjectRepository';
import { SessionRepository } from '../repositories/SessionRepository';

export class ProjectService {
  private projectRepository: ProjectRepository;
  private sessionRepository: SessionRepository;

  constructor() {
    this.projectRepository = new ProjectRepository();
    this.sessionRepository = new SessionRepository();
  }

  // Project management
  async createProject(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<Project> {
    // Validate input
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Project name is required');
    }
    
    if (data.name.length > 100) {
      throw new Error('Project name is too long (max 100 characters)');
    }
    
    return await this.projectRepository.createProject({
      name: data.name.trim(),
      description: data.description?.trim(),
      color: data.color,
      icon: data.icon,
      status: 'active'
    });
  }

  async getAllProjects(): Promise<Project[]> {
    return await this.projectRepository.getAllProjects();
  }

  async getActiveProjects(): Promise<Project[]> {
    return await this.projectRepository.getActiveProjects();
  }

  async getProjectById(project_id: string): Promise<Project> {
    const project = await this.projectRepository.getProjectById(project_id);
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  }

  async updateProject(project_id: string, data: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    status?: 'active' | 'completed' | 'archived';
  }): Promise<Project> {
    // Validate input
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error('Project name cannot be empty');
      }
      if (data.name.length > 100) {
        throw new Error('Project name is too long (max 100 characters)');
      }
    }
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.status !== undefined) updateData.status = data.status;
    
    return await this.projectRepository.updateProject(project_id, updateData);
  }

  async deleteProject(project_id: string): Promise<void> {
    // Check if project exists
    await this.getProjectById(project_id);
    
    // Delete project (will cascade delete session associations)
    await this.projectRepository.deleteProject(project_id);
  }

  // Session-Project associations
  async assignSessionToProject(session_id: string, project_id: string): Promise<void> {
    // Validate session exists
    const session = await this.sessionRepository.findById(session_id);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Validate project exists
    await this.getProjectById(project_id);
    
    await this.projectRepository.assignSessionToProject(session_id, project_id);
  }

  async removeSessionFromProject(session_id: string, project_id: string): Promise<void> {
    await this.projectRepository.removeSessionFromProject(session_id, project_id);
  }

  async assignSessionToMultipleProjects(session_id: string, project_ids: string[]): Promise<void> {
    // Validate session exists
    const session = await this.sessionRepository.findById(session_id);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Validate all projects exist
    for (const project_id of project_ids) {
      await this.getProjectById(project_id);
    }
    
    await this.projectRepository.assignSessionToMultipleProjects(session_id, project_ids);
  }

  async updateSessionProjects(session_id: string, project_ids: string[]): Promise<void> {
    // Remove all existing projects
    await this.projectRepository.removeSessionFromAllProjects(session_id);
    
    // Assign new projects
    if (project_ids.length > 0) {
      await this.assignSessionToMultipleProjects(session_id, project_ids);
    }
  }

  async getProjectsBySessionId(session_id: string): Promise<Project[]> {
    return await this.projectRepository.getProjectsBySessionId(session_id);
  }

  async getSessionsByProjectId(project_id: string): Promise<string[]> {
    return await this.projectRepository.getSessionsByProjectId(project_id);
  }

  async getProjectStats(project_id: string): Promise<{
    session_count: number;
    status: string;
    created_at: string;
    updated_at: string;
  }> {
    const project = await this.getProjectById(project_id);
    const session_count = await this.projectRepository.getProjectSessionCount(project_id);
    
    return {
      session_count,
      status: project.status,
      created_at: project.created_at!,
      updated_at: project.updated_at!
    };
  }
}