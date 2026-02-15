import { Request, Response } from 'express';
import { CommonPathService } from '../services/CommonPathService';

export class CommonPathController {
  private service: CommonPathService;

  constructor() {
    this.service = new CommonPathService();
  }

  getAllPaths = async (req: Request, res: Response): Promise<void> => {
    try {
      const paths = await this.service.getAllPaths();
      res.json({ success: true, data: paths });
    } catch (error) {
      console.error('Error getting common paths:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get common paths' 
      });
    }
  };

  getPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const path = await this.service.getPath(id);
      res.json({ success: true, data: path });
    } catch (error) {
      console.error('Error getting common path:', error);
      const message = error instanceof Error ? error.message : 'Failed to get common path';
      const status = message === 'Common path not found' ? 404 : 500;
      res.status(status).json({ success: false, error: message });
    }
  };

  createPath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { label, path, icon, sort_order } = req.body;
      const created = await this.service.createPath({ label, path, icon, sort_order });
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      console.error('Error creating common path:', error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create common path' 
      });
    }
  };

  updatePath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { label, path, icon, sort_order } = req.body;
      const updated = await this.service.updatePath(id, { label, path, icon, sort_order });
      res.json({ success: true, data: updated });
    } catch (error) {
      console.error('Error updating common path:', error);
      const message = error instanceof Error ? error.message : 'Failed to update common path';
      const status = message === 'Common path not found' ? 404 : 400;
      res.status(status).json({ success: false, error: message });
    }
  };

  deletePath = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.service.deletePath(id);
      res.json({ success: true, message: 'Common path deleted successfully' });
    } catch (error) {
      console.error('Error deleting common path:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete common path';
      const status = message === 'Common path not found' ? 404 : 500;
      res.status(status).json({ success: false, error: message });
    }
  };

  reorderPaths = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paths } = req.body;
      await this.service.reorderPaths(paths);
      res.json({ success: true, message: 'Paths reordered successfully' });
    } catch (error) {
      console.error('Error reordering paths:', error);
      res.status(400).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reorder paths' 
      });
    }
  };

  resetToDefault = async (req: Request, res: Response): Promise<void> => {
    try {
      const paths = await this.service.resetToDefault();
      res.json({ success: true, data: paths });
    } catch (error) {
      console.error('Error resetting to default paths:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reset to default' 
      });
    }
  };
}