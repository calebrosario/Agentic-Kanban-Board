import { Request, Response } from 'express';
import { TaskTemplateService } from '../services/TaskTemplateService';

export class TaskTemplateController {
  private service: TaskTemplateService;

  constructor() {
    this.service = new TaskTemplateService();
  }

  getAllTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = await this.service.getAllTemplates();
      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('Error getting task templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task templates'
      });
    }
  };

  getTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const template = await this.service.getTemplate(id);
      res.json({ success: true, data: template });
    } catch (error) {
      console.error('Error getting task template:', error);
      const message = error instanceof Error ? error.message : 'Failed to get task template';
      const status = message === 'Task template not found' ? 404 : 500;
      res.status(status).json({ success: false, error: message });
    }
  };

  createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { label, template, sort_order, is_active } = req.body;
      const created = await this.service.createTemplate({ label, template, sort_order, is_active });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Error creating task template:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task template'
      });
    }
  };

  updateTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { label, template, sort_order, is_active } = req.body;
      const updated = await this.service.updateTemplate(id, { label, template, sort_order, is_active });
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating task template:', error);
      const message = error instanceof Error ? error.message : 'Failed to update task template';
      const status = message === 'Task template not found' ? 404 : 400;
      res.status(status).json({ success: false, error: message });
    }
  };

  deleteTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.service.deleteTemplate(id);
      res.json({ success: true, message: 'Task template deleted successfully' });
    } catch (error) {
      console.error('Error deleting task template:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete task template';
      const status = message.includes('not found') ? 404 : 500;
      res.status(status).json({ success: false, error: message });
    }
  };

  reorderTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { templates } = req.body;
      await this.service.reorderTemplates(templates);
      res.json({ success: true, message: 'Templates reordered successfully' });
    } catch (error) {
      console.error('Error reordering templates:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reorder templates'
      });
    }
  };

  resetToDefault = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = await this.service.resetToDefault();
      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('Error resetting to default templates:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset to default'
      });
    }
  };
}