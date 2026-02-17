import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync as fsExistsSync } from 'fs';

import {
  ToolType,
  IToolProvider,
  StreamEvent,
  StreamEventType,
  SessionOptions,
  ResumeContext,
  Agent,
  ToolSession,
  ToolCapabilities,
  CursorProviderConfig,
  ProviderConfig
} from '../types/provider.types';

/**
 * Cursor MCP server process handle
 */
interface CursorProcess {
  sessionId: string;
  process: ChildProcess;
  status: 'idle' | 'processing' | 'error' | 'completed';
  workingDirectory: string;
  mcpCommand?: string;
  mcpArgs?: string[];
  lastActivityTime: Date;
  startTime: Date;
}

/**
 * CursorProvider - Implements MCP-based tool provider for Cursor IDE
 *
 * Integrates with Cursor via Model Context Protocol (MCP)
 * Uses Cursor's MCP server to execute tools and receive responses
 */
export class CursorProvider extends EventEmitter implements IToolProvider {
  readonly id = ToolType.CURSOR;
  readonly name = 'cursor';
  readonly displayName = 'Cursor IDE';

  private config: CursorProviderConfig = {};
  private initialized = false;
  private processes = new Map<string, CursorProcess>();

  // Default timeout values
  private readonly DEFAULT_TIMEOUT_MS = 3600000;
  private readonly INTERRUPT_TIMEOUT_MS = 5000;
  private readonly CLOSE_TIMEOUT_MS = 10000;

  // Allowed events for on/off registration
  private readonly ALLOWED_EVENTS = ['processStarted', 'processStopped', 'processInterrupted', 'statusUpdate', 'delta', 'error'];

  constructor() {
    super();
  }

  /**
   * Initialize Cursor provider with configuration
   */
  async initialize(config: CursorProviderConfig): Promise<void> {
    if (this.initialized) {
      console.log('CursorProvider already initialized');
      return;
    }

    this.config = { ...config };
    this.initialized = true;
    console.log('CursorProvider initialized', { config: this.config });
  }

  /**
   * Get provider capabilities
   */
  get capabilities(): ToolCapabilities {
    return {
      supportsAgents: true,
      supportsResume: true,
      supportsContinue: true,
      realTimeStreaming: true,
      supportedTools: ['mcp', 'file_read', 'file_write', 'file_search'],
      isLocal: false // MCP requires network communication
    };
  }

  /**
   * Shutdown all active sessions and clean up resources
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down CursorProvider...');

    const stopPromises = Array.from(this.processes.keys()).map(sessionId =>
      this.closeSession(sessionId).catch(error =>
        console.error(`Error stopping session ${sessionId}:`, error)
      )
    );

    await Promise.all(stopPromises);
    this.initialized = false;
    console.log('CursorProvider shutdown complete');
  }

  /**
   * Create a new Cursor session using MCP server
   */
  async createSession(options: SessionOptions): Promise<ToolSession> {
    const sessionId = options.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

    try {
      const cursorProcess = await this.spawnCursorMCPProcess(
        sessionId,
        options.workingDirectory,
        options.agentId,
        options.systemPrompt
      );

      this.processes.set(sessionId, cursorProcess);

      this.emit('processStarted', { sessionId, pid: cursorProcess.process.pid });

      if (options.task) {
        this.emit('statusUpdate', { sessionId, status: 'processing' });
      } else {
        this.emit('statusUpdate', { sessionId, status: 'idle' });
      }

      console.log(`Cursor session created successfully`, { sessionId });

      // Execute initial task if provided
      if (options.task) {
        setImmediate(async () => {
          try {
            await this.sendInput(sessionId, options.task!);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to execute initial task for ${sessionId}:`, error);
            this.emit('error', {
              sessionId,
              error: errorMessage || 'Failed to execute initial task',
              timestamp: new Date(),
              source: 'cursor_provider'
            });
          }
        });
      }

      return {
        id: sessionId,
        toolType: ToolType.CURSOR,
        createdAt: new Date(),
        isActive: true,
        sendInput: (input: string) => this.sendInput(sessionId, input),
        interrupt: () => this.interrupt(sessionId),
        close: () => this.closeSession(sessionId),
        on: (event: string, callback: (...args: unknown[]) => void) => {
          if (this.ALLOWED_EVENTS.includes(event) || event === 'error') {
            this.on(event, callback as (...args: unknown[]) => void);
          }
        },
        off: (event: string, callback?: (...args: unknown[]) => void) => {
          if (this.ALLOWED_EVENTS.includes(event) || event === 'error') {
            if (callback) {
              this.off(event, callback as (...args: unknown[]) => void);
            }
          }
        },
        removeAllListeners: () => {
          for (const event of [...this.ALLOWED_EVENTS, 'error']) {
            this.removeAllListeners(event);
          }
        }
      };
    } catch (error: unknown) {
      console.error(`Failed to create Cursor session:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create Cursor session: ${errorMessage}`);
    }
  }

  /**
   * Resume a previous Cursor session
   */
  async resumeSession(context: ResumeContext): Promise<ToolSession> {
    const sessionId = context.previousSessionId + '-resume-' + Date.now();

    try {
      // Cursor doesn't natively support resume via MCP
      // We'll create a new session and attempt to restore context
      const cursorProcess = await this.spawnCursorMCPProcess(
        sessionId,
        context.workingDirectory || process.cwd(),
        undefined,
        undefined
      );

      this.processes.set(sessionId, cursorProcess);

      this.emit('processStarted', { sessionId, pid: cursorProcess.process.pid });
      this.emit('statusUpdate', { sessionId, status: 'idle' });

      console.log(`Cursor session resumed`, { sessionId, previousSessionId: context.previousSessionId });

      const allowedEvents = ['processStarted', 'processStopped', 'processInterrupted', 'statusUpdate', 'delta', 'error'];

      return {
        id: sessionId,
        toolType: ToolType.CURSOR,
        createdAt: new Date(),
        isActive: true,
        sendInput: (input: string) => this.sendInput(sessionId, input),
        interrupt: () => this.interrupt(sessionId),
        close: () => this.closeSession(sessionId),
        on: (event: string, callback: (...args: unknown[]) => void) => {
          if (allowedEvents.includes(event) || event === 'error') {
            this.on(event, callback as (...args: unknown[]) => void);
          }
        },
        off: (event: string, callback?: (...args: unknown[]) => void) => {
          if (this.ALLOWED_EVENTS.includes(event) || event === 'error') {
            if (callback) {
              this.off(event, callback as (...args: unknown[]) => void);
            }
          }
        },
        removeAllListeners: () => {
          for (const event of [...this.ALLOWED_EVENTS, 'error']) {
            this.removeAllListeners(event);
          }
        }
      };
    } catch (error: unknown) {
      console.error(`Failed to resume Cursor session:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resume Cursor session: ${errorMessage}`);
    }
  }

  /**
   * Continue an existing session with new input
   */
  async* continueSession(sessionId: string, input: string): AsyncIterable<StreamEvent> {
    await this.sendInput(sessionId, input);

    yield {
      type: 'status' as StreamEventType,
      role: 'system',
      content: 'Input sent to Cursor MCP',
      timestamp: new Date()
    };
  }

  /**
   * Load agent configurations from directory
   * Cursor uses MCP servers, agents are configured via MCP tool registration
   */
  async loadAgents(agentsPath: string): Promise<Agent[]> {
    console.log(`Loading MCP server configurations from ${agentsPath}`);

    const agents: Agent[] = [];

    try {
      const dirExists = fsExistsSync(agentsPath);
      if (!dirExists) {
        console.warn(`MCP servers directory does not exist: ${agentsPath}, using default agents`);
        return this.getDefaultAgents();
      }

      const files = await fs.readdir(agentsPath);
      const configFiles = files.filter((f: string) => f.endsWith('.json') || f.endsWith('.config'));

      console.log(`Found ${configFiles.length} MCP server configurations in ${agentsPath}`);

      for (const file of configFiles) {
        const filePath = require('path').join(agentsPath, file);

        try {
          const content = await require('fs/promises').readFile(filePath, 'utf-8');
          const mcpConfig = JSON.parse(content);

          // Convert MCP server config to Agent format
          if (mcpConfig.name && mcpConfig.command) {
            agents.push({
              id: mcpConfig.name,
              name: mcpConfig.displayName || mcpConfig.name,
              description: mcpConfig.description || `MCP server: ${mcpConfig.command}`,
              systemPrompt: mcpConfig.systemPrompt,
              temperature: mcpConfig.temperature || 0.7
            });
          }
        } catch (error) {
          console.error(`Failed to load MCP server config from ${file}:`, error);
        }
      }

      if (agents.length === 0) {
        console.warn(`No MCP servers loaded from ${agentsPath}, using default agents`);
        return this.getDefaultAgents();
      }

      console.log(`Successfully loaded ${agents.length} MCP servers`);

      return agents;
    } catch (error: unknown) {
      console.error(`Failed to load MCP servers from ${agentsPath}:`, error);
      return this.getDefaultAgents();
    }
  }

  /**
   * Send input to an active Cursor session via MCP
   */
  async sendInput(sessionId: string, input: string): Promise<void> {
    const cursorProcess = this.processes.get(sessionId);
    if (!cursorProcess) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { process } = cursorProcess;

    if (!process.stdin) {
      throw new Error(`Process stdin not available for session ${sessionId}`);
    }

    console.log(`Sending input to Cursor session ${sessionId}:`, { input: input.slice(0, 100) + '...' });

    return new Promise((resolve, reject) => {
      if (process.stdin) {
        // For MCP, we send the input as JSON-RPC request
        const mcpRequest = JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tool_call',
          params: {
            sessionId,
            input
          }
        });

        process.stdin.write(mcpRequest + '\n', (error) => {
          if (error) {
            console.error(`Failed to send input to session ${sessionId}:`, error);
            reject(error);
          } else {
            cursorProcess.lastActivityTime = new Date();
            if (cursorProcess.status === 'idle') {
              cursorProcess.status = 'processing';
              this.emit('statusUpdate', { sessionId, status: 'processing' });
            }
            resolve();
          }
        });
      }
    });
  }

  /**
   * Interrupt a running session
   */
  async interrupt(sessionId: string): Promise<void> {
    const cursorProcess = this.processes.get(sessionId);
    if (!cursorProcess) {
      console.warn(`Process info not found for session ${sessionId}`);
      return;
    }

    const { process } = cursorProcess;

    console.log(`Interrupting session ${sessionId}`);

    try {
      process.kill('SIGINT');

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`Session ${sessionId} did not exit gracefully, forcing termination`);
          process.kill('SIGKILL');
          resolve();
        }, this.INTERRUPT_TIMEOUT_MS);

        process.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      console.error(`Error interrupting session ${sessionId}:`, error);
    }

    this.processes.delete(sessionId);
    this.emit('processInterrupted', { sessionId });
    this.emit('statusUpdate', { sessionId, status: 'idle' });

    console.log(`Session interrupted: ${sessionId}`);
  }

  /**
   * Close a session gracefully
   */
  async closeSession(sessionId: string): Promise<void> {
    const cursorProcess = this.processes.get(sessionId);
    if (!cursorProcess) {
      console.warn(`Process info not found for session ${sessionId}`);
      return;
    }

    const { process } = cursorProcess;

    console.log(`Closing session ${sessionId}`);

    try {
      process.stdin?.end();

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`Session ${sessionId} did not exit gracefully, forcing termination`);
          process.kill('SIGKILL');
          resolve();
        }, this.CLOSE_TIMEOUT_MS);

        process.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }

    this.processes.delete(sessionId);
    this.emit('processStopped', { sessionId });

    console.log(`Session closed: ${sessionId}`);
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<string> {
    const cursorProcess = this.processes.get(sessionId);
    if (!cursorProcess) {
      return 'not_found';
    }
    return cursorProcess.status;
  }

  /**
   * Get session metrics (not available via MCP)
   */
  async getSessionMetrics(sessionId: string): Promise<Record<string, unknown> | null> {
    // MCP protocol doesn't provide metrics
    return null;
  }

  /**
   * Spawn Cursor MCP process
   */
  private async spawnCursorMCPProcess(
    sessionId: string,
    workingDirectory: string,
    agentId?: string,
    systemPrompt?: string
  ): Promise<CursorProcess> {
    const args = [
      '--format', 'json',
      '--dir', workingDirectory
    ];

    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }

    if (agentId) {
      args.push('--agent', agentId);
    }

    // Add MCP server configuration if provided
    if (this.config.mcpCommand) {
      args.push('--mcp-command', this.config.mcpCommand);
      if (this.config.mcpArgs && this.config.mcpArgs.length > 0) {
        args.push(...this.config.mcpArgs);
      }
    }

    console.log(`Spawning Cursor MCP process`, { executable: 'cursor', args });

    const childProcess = spawn('cursor', args, {
      cwd: workingDirectory,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    const cursorProcess: CursorProcess = {
      sessionId,
      process: childProcess,
      status: 'idle',
      workingDirectory,
      mcpCommand: this.config.mcpCommand,
      mcpArgs: this.config.mcpArgs,
      lastActivityTime: new Date(),
      startTime: new Date()
    };

    this.setupMCPStreamParsing(childProcess, sessionId);

    childProcess.on('exit', (code: number | null, signal: string | null) => {
      console.log(`Cursor process exited`, { sessionId, code, signal });
      this.processes.delete(sessionId);
      this.emit('processStopped', { sessionId, exitCode: code });
    });

    childProcess.on('error', (error: Error) => {
      console.error(`Cursor process error`, { sessionId, error });
      this.emit('error', {
        sessionId,
        error: error.message,
        timestamp: new Date(),
        source: 'cursor_provider'
      });
    });

    return cursorProcess;
  }

  /**
   * Setup MCP stream parsing for Cursor process
   */
  private setupMCPStreamParsing(process: ChildProcess, sessionId: string): void {
    if (process.stdout) {
      process.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();

        // Parse MCP JSON-RPC responses
        try {
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line);

              // Handle different MCP event types
              if (response.result) {
                this.emit('delta', {
                  type: 'delta',
                  role: 'assistant',
                  content: JSON.stringify(response.result),
                  timestamp: new Date()
                });
              } else if (response.error) {
                this.emit('error', {
                  type: 'error',
                  role: 'system',
                  error: response.error.message || 'MCP Error',
                  timestamp: new Date(),
                  source: 'cursor_provider'
                });
              } else if (response.method === 'tool_call') {
                this.emit('tool_call', {
                  type: 'tool_call',
                  role: 'assistant',
                  content: response.params?.input || '',
                  metadata: {
                    toolName: response.params?.toolName,
                    toolId: response.id
                  },
                  timestamp: new Date()
                });
              } else if (response.method === 'status') {
                 if (response.params?.status) {
                   const processInfo = this.processes.get(sessionId);
                   if (processInfo) {
                     processInfo.status = response.params.status as 'idle' | 'processing' | 'error' | 'completed';
                     processInfo.lastActivityTime = new Date();
                   }
                  this.emit('statusUpdate', {
                    sessionId,
                    status: response.params.status
                  });
                }
              }
            }
          }
        } catch (error) {
          // Not JSON, might be partial data
        }
      });
    }

    if (process.stderr) {
      process.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        console.error(`Cursor stderr:`, { sessionId, text });

        // Try to parse error from stderr
        try {
          const errorMatch = text.match(/Error:\s*(.+)/i);
          if (errorMatch) {
            this.emit('error', {
              sessionId,
              error: errorMatch[1],
              timestamp: new Date(),
              source: 'cursor_provider'
            });
          }
        } catch (error) {
          // Not parseable
        }
      });
    }
  }

  /**
   * Get default agents when no MCP servers are configured
   */
  private getDefaultAgents(): Agent[] {
    return [
      {
        id: 'cursor-default',
        name: 'Cursor Default',
        description: 'Default Cursor agent using MCP servers',
        systemPrompt: 'Cursor is an AI-powered code editor with MCP support.',
        temperature: 0.7
      }
    ];
  }
}
