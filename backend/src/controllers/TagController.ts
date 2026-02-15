import { Request, Response } from 'express';
import { TagService } from '../services/TagService';

export class TagController {
  private tagService: TagService;

  constructor() {
    this.tagService = new TagService();
  }

  // Create a new tag
  createTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, color, type } = req.body;
      
      const tag = await this.tagService.createTag({
        name,
        color,
        type
      });
      
      res.status(201).json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Error creating tag:', error);
      const message = error instanceof Error ? error.message : 'Failed to create tag';
      const status = message.includes('already exists') ? 409 : 400;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Get all tags
  getAllTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const tags = await this.tagService.getAllTags();
      
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error getting tags:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tags'
      });
    }
  };

  // Get tags by type
  getTagsByType = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      
      if (!['general', 'topic', 'department'].includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid tag type'
        });
        return;
      }
      
      const tags = await this.tagService.getTagsByType(type as any);
      
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error getting tags by type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tags by type'
      });
    }
  };

  // Get tag by ID
  getTagById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tagId } = req.params;
      
      const tag = await this.tagService.getTagById(tagId);
      
      res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Error getting tag:', error);
      const message = error instanceof Error ? error.message : 'Failed to get tag';
      const status = message === 'Tag not found' ? 404 : 500;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Update tag
  updateTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tagId } = req.params;
      const { name, color, type } = req.body;
      
      const tag = await this.tagService.updateTag(tagId, {
        name,
        color,
        type
      });
      
      res.json({
        success: true,
        data: tag
      });
    } catch (error) {
      console.error('Error updating tag:', error);
      const message = error instanceof Error ? error.message : 'Failed to update tag';
      const status = message === 'Tag not found' ? 404 : 
                    message.includes('already exists') ? 409 : 400;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Delete tag
  deleteTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tagId } = req.params;
      
      await this.tagService.deleteTag(tagId);
      
      res.json({
        success: true,
        message: 'Tag deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting tag:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete tag';
      const status = message === 'Tag not found' ? 404 : 500;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Get popular tags
  getPopularTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const tags = await this.tagService.getPopularTags(limit);
      
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error getting popular tags:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get popular tags'
      });
    }
  };

  // Assign tag to session
  assignTagToSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, tagId } = req.params;
      
      await this.tagService.assignTagToSession(sessionId, tagId);
      
      res.json({
        success: true,
        message: 'Tag assigned to session successfully'
      });
    } catch (error) {
      console.error('Error assigning tag to session:', error);
      const message = error instanceof Error ? error.message : 'Failed to assign tag to session';
      const status = message.includes('not found') ? 404 : 400;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Remove tag from session
  removeTagFromSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, tagId } = req.params;
      
      await this.tagService.removeTagFromSession(sessionId, tagId);
      
      res.json({
        success: true,
        message: 'Tag removed from session successfully'
      });
    } catch (error) {
      console.error('Error removing tag from session:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to remove tag from session'
      });
    }
  };

  // Update session tags (replace all)
  updateSessionTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { tagIds } = req.body;
      
      if (!Array.isArray(tagIds)) {
        res.status(400).json({
          success: false,
          error: 'tagIds must be an array'
        });
        return;
      }
      
      await this.tagService.updateSessionTags(sessionId, tagIds);
      
      res.json({
        success: true,
        message: 'Session tags updated successfully'
      });
    } catch (error) {
      console.error('Error updating session tags:', error);
      const message = error instanceof Error ? error.message : 'Failed to update session tags';
      const status = message.includes('not found') ? 404 : 400;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Assign tags by names
  assignTagsByNames = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { tagNames, type } = req.body;
      
      if (!Array.isArray(tagNames)) {
        res.status(400).json({
          success: false,
          error: 'tagNames must be an array'
        });
        return;
      }
      
      await this.tagService.assignTagsByNames(sessionId, tagNames, type);
      
      res.json({
        success: true,
        message: 'Tags assigned to session successfully'
      });
    } catch (error) {
      console.error('Error assigning tags by names:', error);
      const message = error instanceof Error ? error.message : 'Failed to assign tags';
      const status = message.includes('not found') ? 404 : 400;
      
      res.status(status).json({
        success: false,
        error: message
      });
    }
  };

  // Get tags by session ID
  getTagsBySessionId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      const tags = await this.tagService.getTagsBySessionId(sessionId);
      
      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Error getting tags by session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tags for session'
      });
    }
  };

  // Get sessions by tag ID
  getSessionsByTagId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tagId } = req.params;
      
      const sessionIds = await this.tagService.getSessionsByTagId(tagId);
      
      res.json({
        success: true,
        data: sessionIds
      });
    } catch (error) {
      console.error('Error getting sessions by tag:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions for tag'
      });
    }
  };
}