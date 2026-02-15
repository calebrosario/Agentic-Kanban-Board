import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { Readable } from 'stream';
import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { IToolProvider } from './IToolProvider';
import {
  ToolType,
  SessionOptions,
  ResumeContext,
  StreamEvent,
  ToolCapabilities,
  OpenCodeProviderConfig,
  Agent
} from '../types/provider.types';
import { OpenCodeStreamParser } from '../parsers/OpenCodeStreamParser';

interface OpenCodeProcess {
  sessionId: string;
  toolSessionId?: string;
  process: ChildProcess;
  status: 'idle' | 'processing' | 'error' | 'completed';
  workingDirectory: string;
  lastActivityTime: Date;
  startTime: Date;
  parser?: OpenCodeStreamParser;
}

export class OpenCodeProvider extends EventEmitter implements IToolProvider {
  readonly id = ToolType.OPENCODE;
  readonly displayName = 'OpenCode (with oh-my-opencode)';

  readonly capabilities: ToolCapabilities = {
    supportsAgents: true,  // oh-my-opencode provides 11 specialized agents
    supportsResume: true,
    supportsContinue: true,
    realTimeStreaming: true,
    supportedTools: [
      // File operations
      'file:read',
      'file:write',
      'edit',
      'multiedit',
      // Search
      'grep',
      'glob',
      'ast-grep-search',
      'ast-grep-replace',
      // Bash
      'bash',
      // LSP/AST tools (oh-my-opencode additions)
      'lsp-goto-definition',
      'lsp-find-references',
      'lsp-symbols',
      // MCP tools
      'websearch',
      'context7',
      'grep-app',
      // Task management
      'todowrite',
      'todoread'
    ],
    maxContextTokens: 200000,
    requiresNetwork: true,
    isLocal: true  // CLI tool, not remote API
  };

  private config: OpenCodeProviderConfig;
  private processes: Map<string, OpenCodeProcess> = new Map();
  private initialized: boolean = false;

  constructor() {
    super();

    this.config = {
      executable: 'opencode',
      timeout: 3600000,
      configDir: '~/.config/opencode/',
      configPath: '~/.config/opencode/opencode.json',
      model: 'anthropic/claude-sonnet-4-20250514',
      enabled: true
    };
  }

  async initialize(config: OpenCodeProviderConfig): Promise<void> {
    if (this.initialized) {
      console.log('OpenCodeProvider already initialized');
      return;
    }

    // Merge provided config with defaults
    if (config.executable) {
      this.config.executable = config.executable;
    }
    if (config.timeout) {
      this.config.timeout = config.timeout;
    }
    if (config.configDir) {
      this.config.configDir = config.configDir;
    }
    if (config.configPath) {
      this.config.configPath = config.configPath;
    }
    if (config.model) {
      this.config.model = config.model;
    }

    this.initialized = true;
    console.log('OpenCodeProvider initialized successfully', { config: this.config });
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down OpenCodeProvider...');

    const stopPromises = Array.from(this.processes.keys()).map(sessionId =>
      this.closeSession(sessionId).catch(error =>
        console.error(`Error stopping session ${sessionId}:`, error)
      )
    );

    await Promise.all(stopPromises);
    this.initialized = false;
    console.log('OpenCodeProvider shutdown complete');
  }

  async createSession(options: SessionOptions): Promise<any> {
    const sessionId = options.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

    try {
      const opencodeProcess = await this.spawnOpenCodeProcess(
        sessionId,
        options.workingDirectory,
        options.agentId,
        options.systemPrompt
      );

      this.processes.set(sessionId, opencodeProcess);

      this.emit('processStarted', { sessionId, pid: opencodeProcess.process.pid });

      if (options.task) {
        this.emit('statusUpdate', { sessionId, status: 'processing' });
      } else {
        this.emit('statusUpdate', { sessionId, status: 'idle' });
      }

      console.log(`OpenCode session created successfully`, { sessionId });

      // Execute initial task if provided
      if (options.task) {
        setImmediate(async () => {
          try {
            await this.sendInput(sessionId, options.task!);
          } catch (error: any) {
            console.error(`Failed to execute initial task for ${sessionId}:`, error);
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
        toolSessionId: opencodeProcess.toolSessionId,
        status: options.task ? 'processing' : 'idle'
      };
    } catch (error: any) {
      console.error(`Failed to create OpenCode session:`, error);
      throw new Error(`Failed to create OpenCode session: ${error.message}`);
    }
  }

  private async spawnOpenCodeProcess(
    sessionId: string,
    workingDirectory: string,
    agentId?: string,
    systemPrompt?: string
  ): Promise<OpenCodeProcess> {
    const args = [
      '--format', 'json',
      '--dir', workingDirectory
    ];

    if (this.config.model) {
      args.push('--model', this.config.model);
    }

    if (agentId) {
      args.push('--agent', agentId);
    }

    console.log(`Spawning OpenCode process`, { executable: this.config.executable, args });

    const childProcess = spawn(this.config.executable!, args, {
      cwd: workingDirectory,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    const parser = new OpenCodeStreamParser({ sessionId });

    parser.on('event', (event: StreamEvent) => {
      if (event.type === 'delta') {
        this.emit('delta', event);
      } else if (event.type === 'tool_call') {
        this.emit('delta', event);
      } else if (event.type === 'thinking') {
        this.emit('delta', event);
      } else if (event.type === 'status') {
        if (event.data?.status) {
          this.emit('statusUpdate', { sessionId, status: event.data.status });
          const processInfo = this.processes.get(sessionId);
          if (processInfo) {
            processInfo.status = event.data.status as any;
            processInfo.lastActivityTime = new Date();
          }
        }
      } else if (event.type === 'error') {
        this.emit('error', {
          sessionId,
          error: event.content || 'Unknown error',
          timestamp: event.timestamp
        });
      }
    });

    parser.on('error', (error: any) => {
      console.error(`Parser error for session ${sessionId}:`, error);
      this.emit('error', {
        sessionId,
        error: error.error || 'Parser error',
        timestamp: new Date()
      });
    });

    const opencodeProcess: OpenCodeProcess = {
      sessionId,
      process: childProcess,
      status: 'idle',
      workingDirectory,
      lastActivityTime: new Date(),
      startTime: new Date(),
      parser
    };

    this.setupStreamParsing(childProcess, sessionId, parser);

    childProcess.on('exit', (code: number | null, signal: string | null) => {
      console.log(`OpenCode process exited`, { sessionId, code, signal });
      this.processes.delete(sessionId);
      this.emit('processStopped', { sessionId, exitCode: code });
    });

    childProcess.on('error', (error: Error) => {
      console.error(`OpenCode process error`, { sessionId, error });
      this.emit('error', {
        sessionId,
        error: error.message,
        timestamp: new Date()
      });
    });

    return opencodeProcess;
  }

  private setupStreamParsing(process: ChildProcess, sessionId: string, parser: OpenCodeStreamParser): void {
    process.stdout?.on('data', (chunk) => {
      parser.parse(chunk.toString());
    });

    process.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      console.error(`OpenCode stderr:`, { sessionId, text });
    });
  }

  async resumeSession(context: ResumeContext): Promise<any> {
    const sessionId = context.previousSessionId + '-resume-' + Date.now();

    try {
      const opencodeProcess = await this.spawnOpenCodeResumeProcess(
        sessionId,
        context.previousSessionId,
        context.workingDirectory || process.cwd()
      );

      this.processes.set(sessionId, opencodeProcess);

      this.emit('processStarted', { sessionId, pid: opencodeProcess.process.pid });
      this.emit('statusUpdate', { sessionId, status: 'idle' });

      console.log(`OpenCode session resumed`, { sessionId, previousSessionId: context.previousSessionId });

      return {
        sessionId,
        toolSessionId: opencodeProcess.toolSessionId,
        status: 'idle',
        continueChat: context.continueChat || false
      };
    } catch (error: any) {
      console.error(`Failed to resume OpenCode session:`, error);
      throw new Error(`Failed to resume OpenCode session: ${error.message}`);
    }
  }

  private async spawnOpenCodeResumeProcess(
    sessionId: string,
    previousSessionId: string,
    workingDirectory: string
  ): Promise<OpenCodeProcess> {
    const args = [
      '--format', 'json',
      '--dir', workingDirectory,
      '--continue'
    ];

    if (this.config.model) {
      args.push('--model', this.config.model);
    }

    console.log(`Spawning OpenCode resume process`, { executable: this.config.executable, args });

    const childProcess = spawn(this.config.executable!, args, {
      cwd: workingDirectory,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });

    const parser = new OpenCodeStreamParser({ sessionId });

    parser.on('event', (event: StreamEvent) => {
      if (event.type === 'delta') {
        this.emit('delta', event);
      } else if (event.type === 'tool_call') {
        this.emit('delta', event);
      } else if (event.type === 'thinking') {
        this.emit('delta', event);
      } else if (event.type === 'status') {
        if (event.data?.status) {
          this.emit('statusUpdate', { sessionId, status: event.data.status });
          const processInfo = this.processes.get(sessionId);
          if (processInfo) {
            processInfo.status = event.data.status as any;
            processInfo.lastActivityTime = new Date();
          }
        }
      } else if (event.type === 'error') {
        this.emit('error', {
          sessionId,
          error: event.content || 'Unknown error',
          timestamp: event.timestamp
        });
      }
    });

    parser.on('error', (error: any) => {
      console.error(`Parser error for session ${sessionId}:`, error);
      this.emit('error', {
        sessionId,
        error: error.error || 'Parser error',
        timestamp: new Date()
      });
    });

    const opencodeProcess: OpenCodeProcess = {
      sessionId,
      process: childProcess,
      status: 'idle',
      workingDirectory,
      lastActivityTime: new Date(),
      startTime: new Date(),
      parser
    };

    this.setupStreamParsing(childProcess, sessionId, parser);

    childProcess.on('exit', (code: number | null, signal: string | null) => {
      console.log(`OpenCode process exited`, { sessionId, code, signal });
      this.processes.delete(sessionId);
      this.emit('processStopped', { sessionId, exitCode: code });
    });

    childProcess.on('error', (error: Error) => {
      console.error(`OpenCode process error`, { sessionId, error });
      this.emit('error', {
        sessionId,
        error: error.message,
        timestamp: new Date()
      });
    });

    return opencodeProcess;
  }

  async* continueSession(sessionId: string, input: string): AsyncIterable<StreamEvent> {
    await this.sendInput(sessionId, input);

    yield {
      type: 'status' as any,
      role: 'system',
      content: 'Input sent to OpenCode',
      timestamp: new Date()
    };
  }

  async loadAgents(agentsPath: string): Promise<Agent[]> {
    console.log(`Loading agents from ${agentsPath}`);

    const agents: Agent[] = [];

    try {
      const dirExists = existsSync(agentsPath);
      if (!dirExists) {
        console.warn(`Agents directory does not exist: ${agentsPath}, using default agents`);
        return this.getDefaultAgents();
      }

      const files = await readdir(agentsPath);
      const skillFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.SKILL.md'));

      console.log(`Found ${skillFiles.length} agent files in ${agentsPath}`);

      for (const file of skillFiles) {
        const filePath = join(agentsPath, file);

        try {
          const content = await readFile(filePath, 'utf-8');
          const agent = this.parseAgentFile(content, file);

          if (agent) {
            agents.push(agent);
          }
        } catch (error) {
          console.error(`Failed to load agent from ${file}:`, error);
        }
      }

      if (agents.length === 0) {
        console.warn(`No agents loaded from ${agentsPath}, using default agents`);
        return this.getDefaultAgents();
      }

      console.log(`Successfully loaded ${agents.length} agents`);

      return agents;
    } catch (error) {
      console.error(`Failed to load agents from ${agentsPath}:`, error);
      return this.getDefaultAgents();
    }
  }

  private parseAgentFile(content: string, filename: string): Agent | null {
    const agentId = filename.replace('.md', '').replace('.SKILL', '');

    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    let name = agentId;
    let description: string | undefined;
    let systemPrompt: string | undefined;
    let temperature: number | undefined;

    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];

      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
      if (nameMatch) {
        name = nameMatch[1].trim();
      }

      const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
      if (descMatch) {
        description = descMatch[1].trim();
      }

      const tempMatch = frontmatter.match(/^temperature:\s*(.+)$/m);
      if (tempMatch) {
        const tempValue = parseFloat(tempMatch[1]);
        if (!isNaN(tempValue)) {
          temperature = tempValue;
        }
      }
    }

    const contentWithoutFrontmatter = content.replace(/^---\s*\n[\s\S]*?\n---/, '');

    if (contentWithoutFrontmatter.trim()) {
      systemPrompt = contentWithoutFrontmatter.trim();
    }

    return {
      id: agentId,
      name,
      description,
      systemPrompt,
      temperature
    };
  }

  private getDefaultAgents(): Agent[] {
    return [
      {
        id: 'sisyphus',
        name: 'Sisyphus',
        description: 'Main orchestrator - delegates to other agents based on task type',
        systemPrompt: 'Sisyphus is the main orchestrator agent that delegates to other specialized agents based on task complexity and requirements.',
        temperature: 0.1
      },
      {
        id: 'prometheus',
        name: 'Prometheus',
        description: 'Strategic planning agent - creates detailed implementation plans',
        systemPrompt: 'Prometheus specializes in strategic planning and creates detailed implementation plans.',
        temperature: 0.1
      },
      {
        id: 'oracle',
        name: 'Oracle',
        description: 'Debugging and architecture consultation - analyzes complex problems',
        systemPrompt: 'Oracle provides debugging and architecture consultation for complex problems.',
        temperature: 0.1
      },
      {
        id: 'librarian',
        name: 'Librarian',
        description: 'Codebase researcher - searches docs, GitHub, OSS implementations',
        systemPrompt: 'Librarian is a codebase researcher that searches documentation, GitHub, and OSS implementations.',
        temperature: 0.1
      },
      {
        id: 'explore',
        name: 'Explore',
        description: 'Fast codebase grep - finds patterns and implementations',
        systemPrompt: 'Explore is a fast codebase grep agent that finds patterns and implementations.',
        temperature: 0.1
      },
      {
        id: 'metis',
        name: 'Metis',
        description: 'Pre-planning analysis - identifies ambiguities and AI failure points',
        systemPrompt: 'Metis performs pre-planning analysis to identify ambiguities and AI failure points.',
        temperature: 0.3
      },
      {
        id: 'momus',
        name: 'Momus',
        description: 'Plan validation - evaluates work plans for clarity and completeness',
        systemPrompt: 'Momus validates work plans for clarity, verifiability, and completeness.',
        temperature: 0.1
      }
    ];
  }

  async sendInput(sessionId: string, input: string): Promise<void> {
    const processInfo = this.processes.get(sessionId);
    if (!processInfo) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const { process } = processInfo;

    if (!process.stdin) {
      throw new Error(`Process stdin not available for session ${sessionId}`);
    }

    console.log(`Sending input to OpenCode session ${sessionId}:`, { input: input.slice(0, 100) + '...' });

    return new Promise((resolve, reject) => {
      if (process.stdin) {
        process.stdin.write(input + '\n', (error) => {
          if (error) {
            console.error(`Failed to send input to session ${sessionId}:`, error);
            reject(error);
          } else {
            processInfo.lastActivityTime = new Date();
            if (processInfo.status === 'idle') {
              processInfo.status = 'processing';
              this.emit('statusUpdate', { sessionId, status: 'processing' });
            }
            resolve();
          }
        });
      }
    });
  }

  async interrupt(sessionId: string): Promise<void> {
    const processInfo = this.processes.get(sessionId);
    if (!processInfo) {
      console.warn(`Process info not found for session ${sessionId}`);
      return;
    }

    const { process } = processInfo;

    console.log(`Interrupting session ${sessionId}`);

    try {
      process.kill('SIGINT');

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`Session ${sessionId} did not exit gracefully, forcing termination`);
          process.kill('SIGKILL');
          resolve();
        }, 5000);

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

  async closeSession(sessionId: string): Promise<void> {
    const processInfo = this.processes.get(sessionId);
    if (!processInfo) {
      console.warn(`Process info not found for session ${sessionId}`);
      return;
    }

    const { process } = processInfo;

    console.log(`Closing session ${sessionId}`);

    try {
      process.stdin?.end();

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`Session ${sessionId} did not exit gracefully, forcing termination`);
          process.kill('SIGKILL');
          resolve();
        }, 10000);

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

  async getSessionStatus(sessionId: string): Promise<string> {
    const processInfo = this.processes.get(sessionId);
    if (!processInfo) {
      return 'not_found';
    }
    return processInfo.status;
  }

  async getSessionMetrics(sessionId: string): Promise<any | null> {
    // OpenCode CLI doesn't provide metrics in spawn mode
    return null;
  }
}
