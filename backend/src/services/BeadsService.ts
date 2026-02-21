import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface BeadsTask {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed';
  priority: number; // 0-4 (0=P0 highest, 4=P4 lowest)
  issue_type: 'task' | 'feature' | 'bug' | 'epic' | 'chore';
  assignee?: string;
  owner: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  dependencies?: Array<{
    issue_id: string;
    depends_on_id: string;
    type: string;
  }>;
  dependency_count: number;
  dependent_count: number;
  comment_count: number;
}

export class BeadsService {
  /**
   * List all beads tasks in the given working directory
   */
  async listTasks(workingDir: string, options?: {
    status?: string;
    priority?: number;
    type?: string;
  }): Promise<BeadsTask[]> {
    const beadsDir = path.join(workingDir, '.beads');
    const beadsDb = path.join(beadsDir, 'beads.db');

    try {
      await fs.access(beadsDb);
    } catch {
      logger.warn(`Beads database not found at: ${beadsDb}`);
      return [];
    }

    try {
      let cmd = 'bd list --json';

      // Add filters
      if (options?.status) {
        cmd += ` status=${options.status}`;
      }
      if (options?.priority !== undefined) {
        cmd += ` priority=${options.priority}`;
      }
      if (options?.type) {
        cmd += ` type=${options.type}`;
      }

      const { stdout } = await execAsync(cmd, {
        cwd: workingDir,
        env: { ...process.env, BEADS_DB: beadsDb }
      });

      const tasks: BeadsTask[] = JSON.parse(stdout);
      logger.info(`Retrieved ${tasks.length} beads tasks from ${workingDir}`);
      return tasks;
    } catch (error) {
      logger.error(`Failed to list beads tasks: ${error}`);
      throw error;
    }
  }

  /**
   * Get a specific beads task by ID
   */
  async getTask(workingDir: string, taskId: string): Promise<BeadsTask | null> {
    const beadsDb = path.join(workingDir, '.beads', 'beads.db');

    try {
      await fs.access(beadsDb);
    } catch {
      logger.warn(`Beads database not found at: ${beadsDb}`);
      return null;
    }

    try {
      const { stdout } = await execAsync(`bd show ${taskId} --json`, {
        cwd: workingDir,
        env: { ...process.env, BEADS_DB: beadsDb }
      });

      const task: BeadsTask = JSON.parse(stdout);
      logger.info(`Retrieved beads task: ${taskId}`);
      return task;
    } catch (error) {
      logger.error(`Failed to get beads task ${taskId}: ${error}`);
      return null;
    }
  }

  /**
   * Update a beads task status
   */
  async updateTaskStatus(
    workingDir: string,
    taskId: string,
    status: 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed'
  ): Promise<void> {
    const beadsDb = path.join(workingDir, '.beads', 'beads.db');

    try {
      await fs.access(beadsDb);
    } catch {
      logger.warn(`Beads database not found at: ${beadsDb}`);
      return;
    }

    try {
      await execAsync(`bd update ${taskId} --status ${status}`, {
        cwd: workingDir,
        env: { ...process.env, BEADS_DB: beadsDb }
      });

      logger.info(`Updated beads task ${taskId} status to ${status}`);
    } catch (error) {
      logger.error(`Failed to update beads task ${taskId}: ${error}`);
      throw error;
    }
  }

  /**
   * Close a beads task with resolution
   */
  async closeTask(
    workingDir: string,
    taskId: string,
    resolution: string
  ): Promise<void> {
    const beadsDb = path.join(workingDir, '.beads', 'beads.db');

    try {
      await fs.access(beadsDb);
    } catch {
      logger.warn(`Beads database not found at: ${beadsDb}`);
      return;
    }

    try {
      await execAsync(`bd close ${taskId} --resolution ${resolution}`, {
        cwd: workingDir,
        env: { ...process.env, BEADS_DB: beadsDb }
      });

      logger.info(`Closed beads task ${taskId} with resolution: ${resolution}`);
    } catch (error) {
      logger.error(`Failed to close beads task ${taskId}: ${error}`);
      throw error;
    }
  }

  /**
   * Query beads tasks with complex filters
   */
  async queryTasks(
    workingDir: string,
    query: string
  ): Promise<BeadsTask[]> {
    const beadsDb = path.join(workingDir, '.beads', 'beads.db');

    try {
      await fs.access(beadsDb);
    } catch {
      logger.warn(`Beads database not found at: ${beadsDb}`);
      return [];
    }

    try {
      const { stdout } = await execAsync(`bd query "${query}" --json`, {
        cwd: workingDir,
        env: { ...process.env, BEADS_DB: beadsDb }
      });

      const tasks: BeadsTask[] = JSON.parse(stdout);
      logger.info(`Query returned ${tasks.length} beads tasks`);
      return tasks;
    } catch (error) {
      logger.error(`Failed to query beads tasks: ${error}`);
      throw error;
    }
  }
}
