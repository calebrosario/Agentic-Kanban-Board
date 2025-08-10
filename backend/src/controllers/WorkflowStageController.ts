import { Request, Response } from 'express';
import { WorkflowStageService } from '../services/WorkflowStageService';
import { logger } from '../utils/logger';

export class WorkflowStageController {
  private service: WorkflowStageService;

  constructor() {
    this.service = new WorkflowStageService();
  }

  // GET /api/workflow-stages
  getAllStages = async (req: Request, res: Response): Promise<void> => {
    try {
      const activeOnly = req.query.active === 'true';
      const stages = await this.service.getAllStages(activeOnly);
      res.json(stages);
    } catch (error) {
      logger.error('Error getting workflow stages:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get workflow stages'
      });
    }
  };

  // GET /api/workflow-stages/:id
  getStage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stage = await this.service.getStage(id);
      res.json(stage);
    } catch (error: any) {
      logger.error(`Error getting workflow stage ${req.params.id}:`, error);
      const statusCode = error.code === 'STAGE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get workflow stage'
      });
    }
  };

  // POST /api/workflow-stages
  createStage = async (req: Request, res: Response): Promise<void> => {
    try {
      const stage = await this.service.createStage(req.body);
      res.status(201).json(stage);
    } catch (error: any) {
      logger.error('Error creating workflow stage:', error);
      const statusCode = error.code === 'DUPLICATE_NAME' ? 409 : 
                        error.code === 'INVALID_REQUEST' ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create workflow stage'
      });
    }
  };

  // PUT /api/workflow-stages/:id
  updateStage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const stage = await this.service.updateStage(id, req.body);
      res.json(stage);
    } catch (error: any) {
      logger.error(`Error updating workflow stage ${req.params.id}:`, error);
      const statusCode = error.code === 'STAGE_NOT_FOUND' ? 404 :
                        error.code === 'DUPLICATE_NAME' ? 409 :
                        error.code === 'INVALID_REQUEST' ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update workflow stage'
      });
    }
  };

  // DELETE /api/workflow-stages/:id
  deleteStage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.service.deleteStage(id);
      res.status(204).send();
    } catch (error: any) {
      logger.error(`Error deleting workflow stage ${req.params.id}:`, error);
      const statusCode = error.code === 'STAGE_NOT_FOUND' ? 404 :
                        error.code === 'DELETE_ERROR' ? 500 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete workflow stage'
      });
    }
  };

  // POST /api/workflow-stages/reorder
  reorderStages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { stages } = req.body;
      if (!Array.isArray(stages)) {
        res.status(400).json({
          success: false,
          message: 'Invalid request: stages must be an array'
        });
        return;
      }
      
      await this.service.reorderStages(stages);
      res.json({ success: true, message: 'Stages reordered successfully' });
    } catch (error: any) {
      logger.error('Error reordering workflow stages:', error);
      const statusCode = error.code === 'STAGE_NOT_FOUND' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to reorder workflow stages'
      });
    }
  };


  // GET /api/workflow-stages/:id/effective-prompt
  getEffectivePrompt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getEffectivePrompt(id);
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting effective prompt:', error);
      const statusCode = error.code === 'STAGE_NOT_FOUND' ? 404 : 
                        error.code === 'AGENT_NOT_FOUND' ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to get effective prompt'
      });
    }
  };

  // POST /api/workflow-stages/check-agent
  checkAgentExists = async (req: Request, res: Response): Promise<void> => {
    try {
      const { agentName } = req.body;
      
      if (!agentName) {
        res.status(400).json({
          success: false,
          message: 'Agent name is required'
        });
        return;
      }

      const exists = await this.service.checkAgentExists(agentName);
      res.json({ 
        exists,
        agentName 
      });
    } catch (error) {
      logger.error('Error checking agent exists:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check agent'
      });
    }
  };
}