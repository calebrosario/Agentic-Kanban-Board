import { Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  // Create a new project
  createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, color, icon } = req.body;
      
      const project = await this.projectService.createProject({
        name,
        description,
        color,
        icon
      });
      
      res.status(201).json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project'
      });
    }
  };

  // Get all projects
  getAllProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const projects = await this.projectService.getAllProjects();
      
      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get projects'
      });
    }
  };

  // Get active projects only
  getActiveProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const projects = await this.projectService.getActiveProjects();
      
      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('Error getting active projects:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active projects'
      });
    }
  };

  // Get project by ID
  getProjectById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      const project = await this.projectService.getProjectById(projectId);
      
      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Error getting project:', error);
      const message = error instanceof Error ? error.message : 'Failed to get project';
      const status = message === 'Project not found' ? 404 : 500;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Update project
  updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { name, description, color, icon, status } = req.body;
      
      const project = await this.projectService.updateProject(projectId, {
        name,
        description,
        color,
        icon,
        status
      });
      
      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Error updating project:', error);
      const message = error instanceof Error ? error.message : 'Failed to update project';
      const status = message === 'Project not found' ? 404 : 400;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Delete project
  deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      await this.projectService.deleteProject(projectId);
      
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete project';
      const status = message === 'Project not found' ? 404 : 500;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Get project statistics
  getProjectStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      const stats = await this.projectService.getProjectStats(projectId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting project stats:', error);
      const message = error instanceof Error ? error.message : 'Failed to get project stats';
      const status = message === 'Project not found' ? 404 : 500;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Assign session to project
  assignSessionToProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, projectId } = req.params;
      
      await this.projectService.assignSessionToProject(sessionId, projectId);
      
      res.json({
        success: true,
        message: 'Session assigned to project successfully'
      });
    } catch (error) {
      console.error('Error assigning session to project:', error);
      const message = error instanceof Error ? error.message : 'Failed to assign session to project';
      const status = message.includes('not found') ? 404 : 400;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Remove session from project
  removeSessionFromProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, projectId } = req.params;
      
      await this.projectService.removeSessionFromProject(sessionId, projectId);
      
      res.json({
        success: true,
        message: 'Session removed from project successfully'
      });
    } catch (error) {
      console.error('Error removing session from project:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to remove session from project'
      });
    }
  };

  // Update session projects (replace all)
  updateSessionProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { projectIds } = req.body;
      
      if (!Array.isArray(projectIds)) {
        res.status(400).json({
          success: false,
          error: 'projectIds must be an array'
        });
        return;
      }
      
      await this.projectService.updateSessionProjects(sessionId, projectIds);
      
      res.json({
        success: true,
        message: 'Session projects updated successfully'
      });
    } catch (error) {
      console.error('Error updating session projects:', error);
      const message = error instanceof Error ? error.message : 'Failed to update session projects';
      const status = message.includes('not found') ? 404 : 400;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Get projects by session ID
  getProjectsBySessionId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      const projects = await this.projectService.getProjectsBySessionId(sessionId);
      
      res.json({
        success: true,
        data: projects
      });
    } catch (error) {
      console.error('Error getting projects by session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get projects for session'
      });
    }
  };

  // Get sessions by project ID
  getSessionsByProjectId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      const sessionIds = await this.projectService.getSessionsByProjectId(projectId);
      
      res.json({
        success: true,
        data: sessionIds
      });
    } catch (error) {
      console.error('Error getting sessions by project:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions for project'
      });
    }
  };
}