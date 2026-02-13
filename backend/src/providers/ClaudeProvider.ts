import { EventEmitter } from 'events';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { IToolProvider } from './IToolProvider';
import {
  ToolType,
  SessionOptions,
  ResumeContext,
  StreamEvent,
  ToolCapabilities,
  ClaudeProviderConfig
} from '../types/provider.types';
import {
  ClaudeStreamMessage,
  ClaudeCodeConfig,
  ProcessInfo,
  ProcessStatus
} from '../types/process.types';
import { Session } from '../types/session.types';
import { MessageRepository } from '../repositories/MessageRepository';
import { SessionRepository } from '../repositories/SessionRepository';
import { logger } from '../utils/logger';
import { getNotificationService } from '../services/NotificationService';
import { StreamProcessor } from '../services/StreamProcessor';
import { MessageAccumulator } from '../services/MessageAccumulator';
import { UnifiedStreamProcessor } from '../services/UnifiedStreamProcessor';

/**
 * ClaudeProvider - Provider implementation for Claude Code CLI
 *
 * Extracted from ProcessManager to implement IToolProvider interface.
 * Preserves all existing Claude Code functionality while providing
 * a standardized interface for multi-tool support.
 */
export class ClaudeProvider extends EventEmitter implements IToolProvider {
  readonly id = ToolType.CLAUDE;
  readonly displayName = 'Claude Code';

  readonly capabilities: ToolCapabilities = {
    supportsAgents: true,
    supportsResume: true,
    supportsContinue: true,
    realTimeStreaming: true,
    supportedTools: ['read', 'bash', 'grep', 'glob', 'edit', 'write'],
    maxContextTokens: 200000,
    requiresNetwork: true,
    isLocal: true
  };

  private config: ClaudeCodeConfig & ClaudeProviderConfig & { healthCheckInterval: number; maxIdleTime: number; enableMetrics: boolean; logLevel: string };
  private processInfo: Map<string, ProcessInfo> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private messageRepository: MessageRepository;
  private sessionRepository: SessionRepository;
  private streamProcessors: Map<string, StreamProcessor> = new Map();
  private messageAccumulators: Map<string, MessageAccumulator> = new Map();
  private unifiedProcessors: Map<string, UnifiedStreamProcessor> = new Map();
  private useStreamMode: boolean = true;
  private useUnifiedProcessor: boolean = true;
  private initialized: boolean = false;

  constructor(enableHealthCheck: boolean = true) {
    super();
    this.messageRepository = new MessageRepository();
    this.sessionRepository = new SessionRepository();

    // Default configuration
    this.config = {
      executablePath: 'npx',
      defaultTimeout: 3600000,
      timeout: 3600000,
      maxMemory: 2048,
      healthCheckInterval: 30000,
      maxIdleTime: 3600000,
      enableMetrics: true,
      logLevel: 'info',
      maxConcurrentProcesses: 10,
      maxMemoryUsage: 2048
    };

    if (enableHealthCheck) {
      this.startHealthCheck();
    }
  }

  async initialize(config: ClaudeProviderConfig): Promise<void> {
    if (this.initialized) {
      logger.info('ClaudeProvider already initialized');
      return;
    }

    // Merge provided config with defaults
    if (config.executablePath) {
      this.config.executablePath = config.executablePath;
    }
    if (config.timeout) {
      this.config.timeout = config.timeout;
      this.config.defaultTimeout = config.timeout;
    }
    if (config.maxMemory) {
      this.config.maxMemory = config.maxMemory;
    }

    await this.ensureDirectories();
    this.initialized = true;
    logger.info('ClaudeProvider initialized successfully', { config: this.config });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down ClaudeProvider...');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const stopPromises = Array.from(this.processInfo.keys()).map(sessionId =>
      this.closeSession(sessionId).catch(error =>
        logger.error(`Error stopping session ${sessionId}:`, error)
      )
    );

    await Promise.all(stopPromises);
    this.initialized = false;
    logger.info('ClaudeProvider shutdown complete');
  }

  async createSession(options: SessionOptions): Promise<any> {
    const sessionId = options.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
    const virtualPid = Date.now();

    // Validate working directory
    if (!fs.existsSync(options.workingDirectory)) {
      throw new Error(`Working directory does not exist: ${options.workingDirectory}`);
    }

    // Create process info
    const processInfo: ProcessInfo = {
      sessionId,
      pid: virtualPid,
      startTime: new Date(),
      status: ProcessStatus.IDLE,
      memoryUsage: 0,
      cpuUsage: 0,
      workingDirectory: options.workingDirectory,
      commandArgs: [],
      lastActivityTime: new Date()
    };

    this.processInfo.set(sessionId, processInfo);

    // Emit events
    this.emit('processStarted', { sessionId, pid: virtualPid });

    if (options.task) {
      this.emit('statusUpdate', { sessionId, status: 'processing' });
    } else {
      this.emit('statusUpdate', { sessionId, status: 'idle' });
    }

    logger.info(`Claude Code session created successfully`, { sessionId, virtualPid });

    // Execute initial task if provided
    if (options.task) {
      setImmediate(async () => {
        try {
          await this.sendInput(sessionId, options.task!);
        } catch (error: any) {
          logger.error(`Failed to execute initial task for ${sessionId}:`, error);
          this.emit('error', {
            sessionId,
            error: error.message || 'Failed to execute initial task',
            timestamp: new Date()
          });
        }
      });
    }

    return {
      sessionId,
      toolSessionId: null, // Will be set by Claude CLI
      status: options.task ? 'processing' : 'idle'
    };
  }

  async resumeSession(context: ResumeContext): Promise<any> {
    const sessionId = context.previousSessionId + '-resume-' + Date.now();
    const virtualPid = Date.now();

    // Validate working directory
    const workingDir = context.workingDirectory || process.cwd();
    if (!fs.existsSync(workingDir)) {
      throw new Error(`Working directory does not exist: ${workingDir}`);
    }

    // Create process info
    const processInfo: ProcessInfo = {
      sessionId,
      pid: virtualPid,
      startTime: new Date(),
      status: ProcessStatus.IDLE,
      memoryUsage: 0,
      cpuUsage: 0,
      workingDirectory: workingDir,
      commandArgs: [],
      lastActivityTime: new Date()
    };

    this.processInfo.set(sessionId, processInfo);

    // Emit events
    this.emit('processStarted', { sessionId, pid: virtualPid });
    this.emit('statusUpdate', { sessionId, status: 'idle' });

    logger.info(`Claude Code session resumed`, { sessionId, previousSessionId: context.previousSessionId });

    return {
      sessionId,
      toolSessionId: null,
      status: 'idle',
      continueChat: context.continueChat || false
    };
  }

  async* continueSession(sessionId: string, input: string): AsyncIterable<StreamEvent> {
    // This method sends input and yields stream events
    // For Claude, we send input through sendInput and emit events
    await this.sendInput(sessionId, input);

    // Since Claude emits events through EventEmitter, we need to convert to async iterable
    // This is a simplified implementation - in production you'd want proper event-to-async conversion
    yield {
      type: 'status' as any,
      role: 'system',
      content: 'Input sent to Claude',
      timestamp: new Date()
    };
  }

  async loadAgents(agentsPath: string): Promise<any[]> {
    if (!fs.existsSync(agentsPath)) {
      logger.warn(`Agents directory does not exist: ${agentsPath}`);
      return [];
    }

    const agents: any[] = [];
    const files = fs.readdirSync(agentsPath);

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(agentsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const name = file.replace('.md', '');

        agents.push({
          id: name,
          name,
          description: content.slice(0, 200) + '...',
          systemPrompt: content
        });
      }
    }

    logger.info(`Loaded ${agents.length} agents from ${agentsPath}`);
    return agents;
  }

  async sendInput(sessionId: string, input: string): Promise<void> {
    const session = await this.getSessionInfo(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Save user message
    logger.info(`Saving user message for session ${sessionId}`);
    await this.messageRepository.save({
      sessionId,
      type: 'user',
      content: input
    });

    // Emit user message event
    const messageData = {
      sessionId,
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    this.emit('message', messageData);

    // Build Claude Code command
    const claudeCommand = this.buildClaudeCommand(session);

    logger.info(`Executing Claude Code for session ${sessionId}`, {
      command: claudeCommand,
      workingDir: session.workingDir
    });

    // Update status to busy
    const processInfo = this.processInfo.get(sessionId);
    if (processInfo) {
      processInfo.status = ProcessStatus.BUSY;
      processInfo.lastActivityTime = new Date();
    }

    this.emit('statusUpdate', { sessionId, status: 'processing' });

    try {
      if (this.useUnifiedProcessor) {
        logger.info(`Using UnifiedStreamProcessor for session ${sessionId}`);
        await this.executeClaudeUnifiedCommand(sessionId, claudeCommand, input, session.workingDir);
      } else if (this.useStreamMode) {
        logger.info(`Using legacy StreamProcessor for session ${sessionId}`);
        await this.executeClaudeStreamCommand(sessionId, claudeCommand, input, session.workingDir);
      } else {
        logger.info(`Using legacy exec mode for session ${sessionId}`);
        await this.executeClaudeCommand(sessionId, claudeCommand, input, session.workingDir);
      }
    } catch (error) {
      logger.error(`Failed to execute Claude Code:`, error);
      await this.handleExecutionError(sessionId, error, claudeCommand);
    }
  }

  async interrupt(sessionId: string): Promise<void> {
    // Check for unified processor
    const unifiedProcessor = this.unifiedProcessors.get(sessionId);
    if (unifiedProcessor) {
      unifiedProcessor.interrupt();
      unifiedProcessor.cleanup(sessionId);
      this.unifiedProcessors.delete(sessionId);
    }

    // Check for stream processor
    const streamProcessor = this.streamProcessors.get(sessionId);
    if (streamProcessor) {
      streamProcessor.interrupt();
      this.streamProcessors.delete(sessionId);

      // Cleanup message accumulator
      const messageAccumulator = this.messageAccumulators.get(sessionId);
      if (messageAccumulator) {
        messageAccumulator.cleanup(sessionId);
        this.messageAccumulators.delete(sessionId);
      }
    }

    const processInfo = this.processInfo.get(sessionId);
    if (!processInfo) {
      throw new Error(`Process info not found for session ${sessionId}`);
    }

    // Kill process if PID exists
    if (processInfo.pid && processInfo.pid > 0) {
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /F /T /PID ${processInfo.pid}`, (error) => {
            if (error) {
              logger.warn(`Failed to kill process ${processInfo.pid}:`, error);
            } else {
              logger.info(`Successfully killed process ${processInfo.pid}`);
            }
          });
        } else {
          process.kill(processInfo.pid, 'SIGTERM');
          setTimeout(() => {
            try {
              process.kill(processInfo.pid, 'SIGKILL');
            } catch (e) {
              // Process may have already ended
            }
          }, 1000);
        }
      } catch (error) {
        logger.warn(`Failed to interrupt process:`, error);
      }
    }

    this.processInfo.delete(sessionId);
    this.emit('processInterrupted', { sessionId });
    this.emit('statusUpdate', { sessionId, status: 'idle' });

    // Save interrupt message
    try {
      await this.messageRepository.save({
        sessionId,
        type: 'assistant',
        content: '⚠️ Execution was interrupted by user'
      });
    } catch (error) {
      logger.error('Failed to save interrupt message:', error);
    }

    logger.info(`Session interrupted: ${sessionId}`);
  }

  async closeSession(sessionId: string): Promise<void> {
    const processInfo = this.processInfo.get(sessionId);
    if (!processInfo) {
      logger.warn(`Process info not found for session ${sessionId}`);
      return;
    }

    processInfo.status = ProcessStatus.STOPPED;
    logger.info(`Closing session ${sessionId}`);

    await this.saveSessionHistory(sessionId);
    this.processInfo.delete(sessionId);
    this.emit('processStopped', { sessionId });
  }

  async getSessionStatus(sessionId: string): Promise<string> {
    const processInfo = this.processInfo.get(sessionId);
    if (!processInfo) {
      return 'not_found';
    }
    return processInfo.status;
  }

  async getSessionMetrics(sessionId: string): Promise<any | null> {
    const processInfo = this.processInfo.get(sessionId);
    if (!processInfo) {
      return null;
    }

    return {
      sessionId,
      timestamp: new Date(),
      memoryUsage: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0
      },
      cpuUsage: {
        user: 0,
        system: 0
      },
      uptime: (Date.now() - processInfo.startTime.getTime()) / 1000
    };
  }

  // Private helper methods

  private buildClaudeCommand(session: any): string {
    const baseFlags = ['-p'];
    if (session.dangerouslySkipPermissions) {
      baseFlags.push('--dangerously-skip-permissions');
    }
    baseFlags.push('--verbose', '--output-format=stream-json');

    if (session.claudeSessionId) {
      return `npx -y @anthropic-ai/claude-code@latest ${baseFlags.join(' ')} --resume=${session.claudeSessionId}`;
    } else if (session.continueChat) {
      return `npx -y @anthropic-ai/claude-code@latest ${baseFlags.join(' ')} --continue`;
    } else {
      return `npx -y @anthropic-ai/claude-code@latest ${baseFlags.join(' ')}`;
    }
  }

  private async executeClaudeUnifiedCommand(
    sessionId: string,
    command: string,
    prompt: string,
    workingDir: string
  ): Promise<void> {
    const unifiedProcessor = new UnifiedStreamProcessor();
    this.unifiedProcessors.set(sessionId, unifiedProcessor);

    this.setupUnifiedEventHandlers(sessionId, unifiedProcessor);

    try {
      const [cmd, ...args] = command.split(' ');
      await unifiedProcessor.startProcess(sessionId, cmd, args, workingDir, prompt);
    } finally {
      unifiedProcessor.cleanup(sessionId);
      this.unifiedProcessors.delete(sessionId);
    }
  }

  private setupUnifiedEventHandlers(sessionId: string, processor: UnifiedStreamProcessor): void {
    processor.on('message', (message: ClaudeStreamMessage) => {
      this.emit('message', message);
    });

    processor.on('messageStart', (data: any) => {
      logger.info(`Message started: ${data.messageId}`, { sessionId });
    });

    processor.on('messageComplete', (data: any) => {
      logger.info(`Message completed: ${data.messageId}`, { sessionId });
    });

    processor.on('sessionId', async (data: { sessionId: string; toolSessionId: string }) => {
      await this.updateSessionToolId(data.sessionId, data.toolSessionId);
    });

    processor.on('error', (error: any) => {
      logger.error('Unified processor error:', error);
      this.emit('error', error);
    });

    processor.on('processStarted', (data: any) => {
      this.emit('processStarted', data);
    });

    processor.on('processExit', async (data: any) => {
      await this.updateSessionStatusOnExit(sessionId);
      this.emit('statusUpdate', { sessionId, status: 'idle' });
      this.emit('processExit', data);
      await this.sendCompletionNotification(sessionId);
    });
  }

  private async executeClaudeStreamCommand(
    sessionId: string,
    command: string,
    prompt: string,
    workingDir: string
  ): Promise<void> {
    if (this.useUnifiedProcessor) {
      const unifiedProcessor = new UnifiedStreamProcessor();
      this.unifiedProcessors.set(sessionId, unifiedProcessor);
      this.setupUnifiedProcessorEventHandlers(sessionId, unifiedProcessor);

      try {
        const [cmd, ...args] = command.split(' ');
        await unifiedProcessor.startProcess(sessionId, cmd, args, workingDir, prompt);
      } catch (error) {
        logger.error(`Unified processor execution failed:`, error);
        throw error;
      }
      return;
    }

    // Legacy stream processor fallback
    const streamProcessor = new StreamProcessor();
    const messageAccumulator = new MessageAccumulator();

    this.streamProcessors.set(sessionId, streamProcessor);
    this.messageAccumulators.set(sessionId, messageAccumulator);

    this.setupStreamEventHandlers(sessionId, streamProcessor, messageAccumulator);

    try {
      const [cmd, ...args] = command.split(' ');
      await streamProcessor.startProcess(sessionId, cmd, args, workingDir, prompt);
    } finally {
      streamProcessor.cleanup(sessionId);
      this.streamProcessors.delete(sessionId);
      this.messageAccumulators.delete(sessionId);
      messageAccumulator.cleanup(sessionId);
    }
  }

  private setupUnifiedProcessorEventHandlers(sessionId: string, processor: UnifiedStreamProcessor): void {
    processor.on('message', (message: ClaudeStreamMessage) => {
      this.emit('message', message);
    });

    processor.on('processStarted', (data) => {
      logger.info(`Unified processor started for session ${sessionId}`, data);
    });

    processor.on('processExit', (data) => {
      logger.info(`Unified processor exited for session ${sessionId}`, data);
      this.unifiedProcessors.delete(sessionId);
    });

    processor.on('error', (error) => {
      logger.error(`Unified processor error for session ${sessionId}:`, error);
      this.emit('error', { sessionId, error });
    });
  }

  private setupStreamEventHandlers(
    sessionId: string,
    streamProcessor: StreamProcessor,
    messageAccumulator: MessageAccumulator
  ): void {
    streamProcessor.on('message', async (message: ClaudeStreamMessage) => {
      this.emit('message', message);
      await messageAccumulator.handleStreamMessage(message);
    });

    streamProcessor.on('messageComplete', async (message: ClaudeStreamMessage) => {
      await messageAccumulator.handleStreamMessage(message);
    });

    streamProcessor.on('sessionId', async (data: { sessionId: string; toolSessionId: string }) => {
      await this.updateSessionToolId(data.sessionId, data.toolSessionId);
    });

    streamProcessor.on('error', (error: any) => {
      logger.error('Stream processor error:', error);
      this.emit('error', error);
    });

    streamProcessor.on('processStarted', (data: any) => {
      this.emit('processStarted', data);
    });

    streamProcessor.on('processExit', async (data: any) => {
      await this.updateSessionStatusOnExit(sessionId);
      this.emit('statusUpdate', { sessionId, status: 'idle' });
      this.emit('processExit', data);
      await this.sendCompletionNotification(sessionId);
    });
  }

  private async executeClaudeCommand(
    sessionId: string,
    command: string,
    prompt: string,
    workingDir: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const execOptions = {
        cwd: workingDir,
        env: {
          ...process.env,
          CLAUDE_SESSION_ID: sessionId,
          NODE_NO_WARNINGS: '1'
        },
        maxBuffer: 10 * 1024 * 1024,
        timeout: this.config.defaultTimeout
      };

      const startTime = Date.now();
      let isInterrupted = false;

      const childProcess = exec(command, execOptions, async (error, stdout, stderr) => {
        if (!this.processInfo.has(sessionId)) {
          isInterrupted = true;
          logger.info(`Process was interrupted, skipping post-processing for session ${sessionId}`);
          resolve();
          return;
        }

        logger.info(`Claude Code execution completed in ${Date.now() - startTime}ms`, { sessionId });
        this.processInfo.delete(sessionId);

        await this.updateSessionStatusOnExit(sessionId);
        this.emit('statusUpdate', { sessionId, status: 'idle' });
        this.emit('processExit', { sessionId, code: 0 });
        await this.sendCompletionNotification(sessionId);

        if (error) {
          await this.handleExecutionError(sessionId, error, command);
          resolve();
          return;
        }

        if (stdout && stdout.trim()) {
          await this.processStreamJsonOutput(sessionId, stdout);
        }

        resolve();
      });

      if (childProcess.stdin) {
        childProcess.stdin.write(prompt);
        childProcess.stdin.end();
      }
    });
  }

  private async processStreamJsonOutput(sessionId: string, output: string): Promise<void> {
    const lines = output.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const json = JSON.parse(line);

        if (json.session_id) {
          await this.updateSessionToolId(sessionId, json.session_id);
        }

        switch (json.type) {
          case 'assistant':
            if (json.message?.content) {
              const content = this.extractTextContent(json.message.content);
              if (content) {
                await this.messageRepository.save({
                  sessionId,
                  type: 'assistant',
                  content
                });

                this.emit('message', {
                  sessionId,
                  type: 'assistant',
                  content,
                  timestamp: new Date()
                });
              }
            }
            break;

          case 'system':
            if (json.subtype === 'init') {
              logger.info(`Claude initialized with model: ${json.model}`);
            }
            break;

          case 'error':
            logger.error(`Claude error:`, json);
            this.emit('error', {
              sessionId,
              error: json.error || json.message || 'Unknown error',
              timestamp: new Date()
            });
            break;
        }
      } catch (parseError) {
        // Handle non-JSON lines
        if (line.trim()) {
          await this.messageRepository.save({
            sessionId,
            type: 'assistant',
            content: line
          });

          this.emit('message', {
            sessionId,
            type: 'assistant',
            content: line,
            timestamp: new Date()
          });
        }
      }
    }
  }

  private extractTextContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      const textParts: string[] = [];
      for (const item of content) {
        if (item.type === 'text' && item.text) {
          textParts.push(item.text);
        }
      }
      return textParts.join('\n');
    }

    return '';
  }

  private async updateSessionToolId(sessionId: string, toolSessionId: string): Promise<void> {
    try {
      const session = await this.sessionRepository.findById(sessionId);
      if (session) {
        session.toolSessionId = toolSessionId;
        await this.sessionRepository.update(session);
        logger.info(`Updated tool session ID for ${sessionId}: ${toolSessionId}`);
      }
    } catch (error) {
      logger.error(`Failed to update tool session ID:`, error);
    }
  }

  private async getSessionInfo(sessionId: string): Promise<any> {
    try {
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) {
        return null;
      }

      return {
        sessionId: session.sessionId,
        workingDir: session.workingDir,
        continueChat: session.continueChat || false,
        previousSessionId: session.previousSessionId,
        toolSessionId: session.toolSessionId,
        dangerouslySkipPermissions: session.dangerouslySkipPermissions || false
      };
    } catch (error) {
      logger.error(`Failed to get session info for ${sessionId}:`, error);
      const processInfo = this.processInfo.get(sessionId);
      if (!processInfo) {
        return null;
      }
      return {
        sessionId,
        workingDir: processInfo.workingDirectory,
        continueChat: false
      };
    }
  }

  private async handleExecutionError(sessionId: string, error: any, command: string): Promise<void> {
    logger.error(`Claude Code execution error:`, {
      error: error instanceof Error ? error.message : error,
      sessionId,
      command: command.slice(0, 200)
    });

    const sessionRepo = new SessionRepository();
    try {
      const session = await sessionRepo.findById(sessionId);
      if (session) {
        session.status = 'error' as any;
        session.error = JSON.stringify({
          message: error instanceof Error ? error.message : 'Execution failed',
          type: 'EXECUTION_ERROR',
          timestamp: new Date().toISOString()
        });
        session.updatedAt = new Date();
        await sessionRepo.update(session);
      }
    } catch (updateError) {
      logger.error('Failed to update session status after error:', updateError);
    }
  }

  private async updateSessionStatusOnExit(sessionId: string): Promise<void> {
    try {
      const session = await this.sessionRepository.findById(sessionId);
      if (session) {
        session.status = 'idle' as any;
        session.error = null;
        session.updatedAt = new Date();
        await this.sessionRepository.update(session);
      }
    } catch (error) {
      logger.error('Failed to update session status:', error);
    }
  }

  private async sendCompletionNotification(sessionId: string): Promise<void> {
    try {
      const notificationService = getNotificationService();
      const session = await this.sessionRepository.findById(sessionId);
      if (session) {
        notificationService.notify({
          title: 'Agentic Kanban Board',
          message: `Task completed: ${session.name}`,
          sound: true
        }).catch(err => {
          logger.error('Failed to send notification:', err);
        });
      }
    } catch (error) {
      logger.error('Failed to send completion notification:', error);
    }
  }

  private async saveSessionHistory(sessionId: string): Promise<void> {
    try {
      const historyPath = path.join('./data/sessions', `${sessionId}.history`);
      const messages = await this.messageRepository.getRecentMessages(sessionId, 1000);

      const historyData = {
        sessionId,
        savedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp
        }))
      };

      fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2));
      logger.info(`Session history saved: ${historyPath}`);
    } catch (error) {
      logger.error(`Failed to save session history for ${sessionId}:`, error);
    }
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = ['./data/sessions', './data/logs', './data/temp'];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      }
    }
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    logger.info('Health check started', { interval: this.config.healthCheckInterval });
  }

  private async performHealthCheck(): Promise<void> {
    const now = Date.now();
    const toStop: string[] = [];

    for (const [sessionId, processInfo] of this.processInfo.entries()) {
      const idleTime = now - processInfo.lastActivityTime.getTime();
      if (idleTime > this.config.maxIdleTime) {
        logger.info(`Session ${sessionId} has been idle for too long:`, {
          idleTime: idleTime / 1000 / 60,
          maxIdleMinutes: this.config.maxIdleTime / 1000 / 60
        });
        toStop.push(sessionId);
        continue;
      }
    }

    for (const sessionId of toStop) {
      try {
        await this.closeSession(sessionId);
        this.emit('processCleanedUp', { sessionId, reason: 'health_check' });
      } catch (error) {
        logger.error(`Failed to stop session ${sessionId} during health check:`, error);
      }
    }

    if (this.config.enableMetrics) {
      this.emit('healthCheck', {
        totalSessions: this.processInfo.size,
        cleanedUp: toStop.length,
        timestamp: new Date()
      });
    }
  }

  /**
   * Set processor mode for debugging/testing
   */
  setProcessorMode(mode: 'unified' | 'stream' | 'legacy'): void {
    switch (mode) {
      case 'unified':
        this.useUnifiedProcessor = true;
        this.useStreamMode = true;
        logger.info('Switched to unified processor mode');
        break;
      case 'stream':
        this.useUnifiedProcessor = false;
        this.useStreamMode = true;
        logger.info('Switched to legacy stream processor mode');
        break;
      case 'legacy':
        this.useUnifiedProcessor = false;
        this.useStreamMode = false;
        logger.info('Switched to legacy batch processor mode');
        break;
    }
  }

  getProcessorMode(): string {
    if (this.useUnifiedProcessor) {
      return 'unified';
    } else if (this.useStreamMode) {
      return 'stream';
    } else {
      return 'legacy';
    }
  }
}
