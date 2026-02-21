import { Request, Response } from 'express';
import { BeadsService } from '../services/BeadsService';
import { SessionService } from '../services/SessionService';
import { WorkItemService } from '../services/WorkItemService';
import { CreateWorkItemRequest, WorkItemStatus } from '../types/workitem.types';
import { logger } from '../utils/logger';

export class BeadsController {
  private beadsService: BeadsService;
  private sessionService: SessionService;
  private workItemService: WorkItemService;

  constructor() {
    this.beadsService = new BeadsService();
    this.sessionService = new SessionService();
    this.workItemService = new WorkItemService();
  }

  async importBeadsTasks(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { taskIds } = req.body; // Optional: specific task IDs to import

      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const beadsTasks = await this.beadsService.listTasks(session.workingDir);
      
      if (beadsTasks.length === 0) {
        res.json({ message: 'No beads tasks found', imported: 0 });
        return;
      }

      const filteredTasks = taskIds 
        ? beadsTasks.filter(task => taskIds.includes(task.id))
        : beadsTasks;

      const importedWorkItems = [];
      
      for (const beadsTask of filteredTasks) {
        const workItemRequest: CreateWorkItemRequest = {
          title: beadsTask.title,
          description: beadsTask.description,
          workspace_path: session.workingDir
        };

        const workItem = await this.workItemService.createWorkItem(workItemRequest);

        importedWorkItems.push({
          beadsTaskId: beadsTask.id,
          workItemId: workItem.work_item_id,
          title: workItem.title
        });
      }

      logger.info(`Imported ${importedWorkItems.length} beads tasks for session ${sessionId}`);

      res.json({
        message: 'Successfully imported beads tasks',
        imported: importedWorkItems.length,
        tasks: importedWorkItems
      });
    } catch (error) {
      logger.error('Failed to import beads tasks:', error);
      res.status(500).json({ error: 'Failed to import beads tasks' });
    }
  }

  async getBeadsTasks(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { status, priority } = req.query;

      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const options: any = {};
      if (status) options.status = status;
      if (priority !== undefined) options.priority = parseInt(priority as string);

      const beadsTasks = await this.beadsService.listTasks(session.workingDir, options);

      res.json({
        sessionId,
        tasks: beadsTasks,
        count: beadsTasks.length
      });
    } catch (error) {
      logger.error('Failed to get beads tasks:', error);
      res.status(500).json({ error: 'Failed to get beads tasks' });
    }
  }
}
