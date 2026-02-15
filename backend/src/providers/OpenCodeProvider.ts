import { EventEmitter } from 'events';
import { IToolProvider } from './IToolProvider';
import {
  ToolType,
  SessionOptions,
  ResumeContext,
  StreamEvent,
  ToolCapabilities,
  OpenCodeProviderConfig
} from '../types/provider.types';

/**
 * OpenCodeProvider - Provider implementation for OpenCode CLI with oh-my-opencode plugin
 *
 * OpenCode is a local CLI tool with oh-my-opencode plugin providing:
 * - 11 specialized AI agents (Sisyphus, Prometheus, Oracle, etc.)
 * - Agent orchestration and delegation
 * - Background task execution
 * - LSP/AST tool integration
 * - MCP server integration
 *
 * Integration Approach:
 * - Spawn opencode CLI with --format json flag
 * - Parse JSONL streaming output
 * - Handle oh-my-opencode agent orchestration events
 * - Emit standardized StreamEvent objects
 */
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
  private processes: Map<string, any> = new Map();
  private initialized: boolean = false;

  constructor() {
    super();

    // Default configuration
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

    // Create session tracking
    this.processes.set(sessionId, {
      sessionId,
      status: 'idle',
      workingDirectory: options.workingDirectory,
      commandArgs: [],
      lastActivityTime: new Date()
    });

    this.emit('processStarted', { sessionId, pid: Date.now() });

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
      toolSessionId: null, // Will be set by OpenCode CLI
      status: options.task ? 'processing' : 'idle'
    };
  }

  async resumeSession(context: ResumeContext): Promise<any> {
    const sessionId = context.previousSessionId + '-resume-' + Date.now();

    const processInfo = this.processes.get(sessionId);
    if (!processInfo) {
      this.processes.set(sessionId, {
        sessionId,
        status: 'idle',
        workingDirectory: context.workingDirectory || process.cwd(),
        commandArgs: [],
        lastActivityTime: new Date()
      });
    }

    this.emit('processStarted', { sessionId, pid: Date.now() });
    this.emit('statusUpdate', { sessionId, status: 'idle' });

    console.log(`OpenCode session resumed`, { sessionId, previousSessionId: context.previousSessionId });

    return {
      sessionId,
      toolSessionId: null,
      status: 'idle',
      continueChat: context.continueChat || false
    };
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

  async loadAgents(agentsPath: string): Promise<any[]> {
    // Placeholder implementation - will load oh-my-opencode agents from ~/.config/opencode/agents/
    // Returns both built-in agents (Build, Plan, General, Explore)
    // and oh-my-opencode agents (Sisyphus, Prometheus, Oracle, Librarian, etc.)

    console.log(`Loading agents from ${agentsPath}`);

    return [
      {
        id: 'sisyphus',
        name: 'Sisyphus',
        description: 'Main orchestrator - delegates to other agents based on task type',
        model: 'zai-coding-plan/glm-4.7',
        temperature: 0.1
      },
      {
        id: 'prometheus',
        name: 'Prometheus',
        description: 'Strategic planning agent - creates detailed implementation plans',
        model: 'zai-coding-plan/glm-4.7',
        temperature: 0.1
      },
      {
        id: 'oracle',
        name: 'Oracle',
        description: 'Debugging and architecture consultation - analyzes complex problems',
        model: 'zai-coding-plan/glm-5',
        temperature: 0.1
      },
      {
        id: 'librarian',
        name: 'Librarian',
        description: 'Codebase researcher - searches docs, GitHub, OSS implementations',
        model: 'zai-coding-plan/glm-4.6',
        temperature: 0.1
      },
      {
        id: 'explore',
        name: 'Explore',
        description: 'Fast codebase grep - finds patterns and implementations',
        model: 'xai/grok-4-1-fast',
        temperature: 0.1
      },
      {
        id: 'metis',
        name: 'Metis',
        description: 'Pre-planning analysis - identifies ambiguities and AI failure points',
        model: 'zai-coding-plan/glm-4.7',
        temperature: 0.3
      },
      {
        id: 'momus',
        name: 'Momus',
        description: 'Plan validation - evaluates work plans for clarity and completeness',
        model: 'zai-coding-plan/glm-5',
        temperature: 0.1
      }
    ];
  }

  async sendInput(sessionId: string, input: string): Promise<void> {
    console.log(`Sending input to OpenCode session ${sessionId}:`, { input: input.slice(0, 100) + '...' });
    // TODO: Implement actual opencode CLI spawn and input handling
    // This will be implemented in Phase 2.2
  }

  async interrupt(sessionId: string): Promise<void> {
    const processInfo = this.processes.get(sessionId);
    if (!processInfo) {
      console.warn(`Process info not found for session ${sessionId}`);
      return;
    }

    // TODO: Implement process interruption
    // This will be implemented in Phase 2.2

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

    // TODO: Implement process cleanup
    // This will be implemented in Phase 2.2

    this.processes.delete(sessionId);
    this.emit('processStopped', { sessionId });

    console.log(`Closing session ${sessionId}`);
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
