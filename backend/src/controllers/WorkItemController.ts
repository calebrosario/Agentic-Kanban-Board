import { Request, Response } from 'express';
import { WorkItemService } from '../services/WorkItemService';
import { 
  CreateWorkItemRequest, 
  UpdateWorkItemRequest,
  WorkItemStatus 
} from '../types/workitem.types';
import { logger } from '../utils/logger';

export class WorkItemController {
  private workItemService: WorkItemService;

  constructor() {
    this.workItemService = new WorkItemService();
  }

  // Create a new work item
  async create(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateWorkItemRequest = req.body;
      const workItem = await this.workItemService.createWorkItem(request);
      res.status(201).json(workItem);
    } catch (error) {
      logger.error('Failed to create work item:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create work item'
      });
    }
  }

  // Get all work items
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { status, project_id } = req.query;
      
      let workItems;
      if (status) {
        workItems = await this.workItemService.listWorkItemsByStatus(status as WorkItemStatus);
      } else if (project_id) {
        workItems = await this.workItemService.listWorkItemsByProject(project_id as string);
      } else {
        workItems = await this.workItemService.listWorkItems();
      }
      
      res.json(workItems);
    } catch (error) {
      logger.error('Failed to list work items:', error);
      res.status(500).json({
        error: 'Failed to list work items'
      });
    }
  }

  // Get a specific work item with its sessions
  async get(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const workItem = await this.workItemService.getWorkItem(id);
      
      if (!workItem) {
        res.status(404).json({ error: 'Work item not found' });
        return;
      }
      
      res.json(workItem);
    } catch (error) {
      logger.error('Failed to get work item:', error);
      res.status(500).json({
        error: 'Failed to get work item'
      });
    }
  }

  // Update a work item
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: UpdateWorkItemRequest = req.body;
      
      const workItem = await this.workItemService.updateWorkItem(id, updates);
      
      if (!workItem) {
        res.status(404).json({ error: 'Work item not found' });
        return;
      }
      
      res.json(workItem);
    } catch (error) {
      logger.error('Failed to update work item:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update work item'
      });
    }
  }

  // Delete a work item
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.workItemService.deleteWorkItem(id);
      
      if (!success) {
        res.status(404).json({ error: 'Work item not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete work item:', error);
      res.status(500).json({
        error: 'Failed to delete work item'
      });
    }
  }


  // Associate a session with a work item
  async associateSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { work_item_id } = req.body;
      
      if (!work_item_id) {
        res.status(400).json({ error: 'work_item_id is required' });
        return;
      }
      
      const success = await this.workItemService.associateSession(sessionId, work_item_id);
      
      if (!success) {
        res.status(404).json({ error: 'Session or work item not found' });
        return;
      }
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to associate session:', error);
      res.status(500).json({
        error: 'Failed to associate session'
      });
    }
  }

  // Disassociate a session from its work item
  async disassociateSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const success = await this.workItemService.disassociateSession(sessionId);
      
      if (!success) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to disassociate session:', error);
      res.status(500).json({
        error: 'Failed to disassociate session'
      });
    }
  }

  // Get work item statistics
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.workItemService.getStats();
      res.json(stats);
    } catch (error) {
      logger.error('Failed to get work item stats:', error);
      res.status(500).json({
        error: 'Failed to get work item stats'
      });
    }
  }

  // Get dev.md content for a work item
  async getDevMd(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const content = await this.workItemService.getDevMdContent(id);
      
      if (content === null) {
        res.status(404).json({ error: 'dev.md not found for this work item' });
        return;
      }
      
      res.json({ content });
    } catch (error) {
      logger.error('Failed to get dev.md content:', error);
      res.status(500).json({
        error: 'Failed to get dev.md content'
      });
    }
  }
}