import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
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
  KiloCodeProviderConfig,
  ProviderConfig
} from '../types/provider.types';

/**
 * KiloCode process wrapper
 * Tracks the CLI process and session metadata
 */
interface KiloCodeProcess {
  sessionId: string;
  process: ChildProcess;
  status: 'idle' | 'processing' | 'error' | 'completed';
  workingDirectory: string;
  executable: string;
  args: string[];
  lastActivityTime: Date;
  startTime: Date;
}

/**
 * KiloCode CLI output event types
 */
interface KiloCodeOutput {
  timestamp?: number;
  source: 'cli' | 'extension';
  type: 'welcome' | 'say' | 'tool_call' | 'error' | 'status' | 'done';
  content?: string;
  say?: 'text' | 'image';
  metadata?: {
    welcomeOptions?: any;
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
  };
  error?: {
    code?: string;
    message: string;
  };
}

/**
 * Allowed events for the session emitter
 */
const ALLOWED_EVENTS = [
  'processStarted',
  'processStopped',
  'processInterrupted',
  'statusUpdate',
  'delta',
  'error'
];

/**
 * Timeout constants (in milliseconds)
 */
const DEFAULT_TIMEOUT_MS = 3600000; // 1 hour
const INTERRUPT_TIMEOUT_MS = 5000; // 5 seconds
const CLOSE_TIMEOUT_MS = 10000; // 10 seconds

/**
 * KiloCodeProvider - Implements AI coding support via KiloCode CLI
 *
 * Integration approach:
 * - Spawns kilocode CLI as subprocess
 * - Parses JSON streaming output from stdout/stderr
 * - Maps events to standardized StreamEvent format
 *
 * Configuration:
 * - KILOCODE_EXECUTABLE: Path to kilocode executable (default: 'kilocode')
 * - KILOCODE_TIMEOUT: Timeout for operations (default: 3600000ms)
 * - KILOCODE_FLAGS: Additional CLI flags
 *
 * Agent loading:
 * - KiloCode doesn't have native agent system like Claude
 * - Agents can be simulated by loading system prompts from ~/.kilocode/agents/
 *
 * KiloCode CLI reference: https://kilo.ai/docs/cli
 */
export class KiloCodeProvider extends EventEmitter implements IToolProvider {
  readonly id = ToolType.KILOCODE;
  readonly name = 'kilocode';
  readonly displayName = 'Kilo Code';

  private config: KiloCodeProviderConfig;
  private sessions = new Map<string, KiloCodeProcess>();
  private agentsPath: string = path.join(process.env.HOME || '', '.kilocode', 'agents');
  private eventListeners = new Map<string, Map<string, Function>>();

  constructor() {
    super();
    this.config = {
      executable: 'kilocode',
      timeout: DEFAULT_TIMEOUT_MS,
      flags: []
    };
  }

  async initialize(config: ProviderConfig): Promise<void> {
    if (config.kilocode) {
      this.config = {
        ...this.config,
        ...config.kilocode
      };
    }

    // Load agents from ~/.kilocode/agents/
    if (fs.existsSync(this.agentsPath)) {
      this.emit('info', `Loading KiloCode agents from ${this.agentsPath}`);
    } else {
      this.emit('warning', `KiloCode agents directory not found at ${this.agentsPath}`);
    }

    this.emit('initialized', { provider: this.id, config: this.config });
  }

  /**
   * Shutdown all active sessions
   */
  async shutdown(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      closePromises.push(this.closeSession(sessionId));
    }

    await Promise.all(closePromises);
    this.sessions.clear();
  }

  /**
   * Get provider capabilities
   */
  get capabilities(): ToolCapabilities {
    return {
      supportsAgents: true, // Simulated via system prompts
      supportsResume: true,
      supportsContinue: true,
      realTimeStreaming: true,
      supportedTools: ['file_read', 'file_write', 'file_edit', 'file_search', 'bash', 'web_search'],
      isLocal: true // Runs via local CLI
    };
  }

  /**
   * Create a new session
   */
  async createSession(options: SessionOptions): Promise<ToolSession> {
    const sessionId = this.generateSessionId();

    const args = [
      '--auto',
      '--json',
      ...this.config.flags || []
    ];

    if (options.task) {
      args.push(options.task);
    }

    const workingDir = options.workingDirectory || process.cwd();
    const env = { ...process.env, KILOCODE_WORKSPACE: workingDir } as Record<string, string>;
    const childProcess = spawn(this.config.executable!, args, {
      cwd: workingDir,
      env
    });

    const session: KiloCodeProcess = {
      sessionId,
      process: childProcess,
      status: 'idle',
      workingDirectory: options.workingDirectory,
      executable: this.config.executable || 'kilocode',
      args: args,
      lastActivityTime: new Date(),
      startTime: new Date()
    };

    this.sessions.set(sessionId, session);

    // Setup stream parsing
    this.setupStreamParsers(session);

    // Create tool session object
    const toolSession: ToolSession = {
      id: sessionId,
      toolType: this.id,
      createdAt: new Date(),
      isActive: true,
      data: {
        workingDirectory: options.workingDirectory,
        title: options.title,
        agentId: options.agentId || undefined
      },
      sendInput: (input: string) => this.sendInput(sessionId, input),
      interrupt: () => this.interrupt(sessionId),
      close: () => this.closeSession(sessionId),
      on: (event: string, callback: (...args: any[]) => void) => {
        if (!ALLOWED_EVENTS.includes(event)) {
          throw new Error(`Event "${event}" is not allowed for this session`);
        }
        return this.on(event, callback);
      },
      off: (event: string, callback?: (...args: any[]) => void): void => {
        if (callback) {
          this.off(event, callback);
        } else {
          this.removeAllListeners(event);
        }
      }
    };

    this.emit('processStarted', { sessionId, timestamp: new Date() });

    // If agent specified, inject system prompt
    if (options.agentId) {
      await this.injectSystemPrompt(sessionId, options.agentId);
    }

    return toolSession;
  }

  /**
   * Resume an existing session
   */
  async resumeSession(context: ResumeContext): Promise<ToolSession> {
    const args = [
      '--continue',
      '--json',
      ...this.config.flags || []
    ];

    const workingDir = context.workingDirectory || process.cwd();
    const env = { ...process.env, KILOCODE_WORKSPACE: workingDir } as Record<string, string>;
    const childProcess = spawn(this.config.executable!, args, {
      cwd: workingDir,
      env
    });

    const sessionId = this.generateSessionId();

    const session: KiloCodeProcess = {
      sessionId,
      process: childProcess,
      status: 'idle',
      workingDirectory: workingDir,
      executable: this.config.executable || 'kilocode',
      args: args,
      lastActivityTime: new Date(),
      startTime: new Date()
    };

    this.sessions.set(sessionId, session);
    this.setupStreamParsers(session);

    const toolSession: ToolSession = {
      id: sessionId,
      toolType: this.id,
      createdAt: new Date(),
      isActive: true,
      data: {
        workingDirectory: context.workingDirectory,
        previousSessionId: context.previousSessionId
      },
      sendInput: (input: string) => this.sendInput(sessionId, input),
      interrupt: () => this.interrupt(sessionId),
      close: () => this.closeSession(sessionId),
      on: (event: string, callback: (...args: any[]) => void) => {
        if (!ALLOWED_EVENTS.includes(event)) {
          throw new Error(`Event "${event}" is not allowed for this session`);
        }
        return this.on(event, callback);
      },
      off: (event: string, callback?: (...args: any[]) => void) => {
        if (callback) {
          this.off(event, callback);
        } else {
          this.removeAllListeners(event);
        }
      }
    };

    this.emit('processStarted', { sessionId, timestamp: new Date() });

    return toolSession;
  }

  /**
   * Continue a session with new input
   */
  async *continueSession(sessionId: string, input: string): AsyncIterable<StreamEvent> {
    await this.sendInput(sessionId, input);

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Yield events that will be emitted from stream parser
    const eventEmitter = this as EventEmitter;
    const eventQueue: StreamEvent[] = [];

    // Collect events for a short duration to return initial response
    const timeout = setTimeout(() => {
      if (eventQueue.length === 0) {
        eventQueue.push({
          type: StreamEventType.STATUS,
          role: 'system',
          content: 'No response received',
          timestamp: new Date()
        });
      }
    }, 3000);

    eventEmitter.once('delta', (event) => {
      clearTimeout(timeout);
      eventQueue.push(event);
    });

    yield* eventQueue;
  }

  /**
   * Load agents from ~/.kilocode/agents/ directory
   * KiloCode doesn't have native agents, so we simulate with system prompts
   */
  async loadAgents(agentsPath: string = this.agentsPath): Promise<Agent[]> {
    const agents: Agent[] = [];

    try {
      const files = fs.readdirSync(agentsPath);

      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(agentsPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');

          // Extract agent name from filename (remove .md extension)
          const agentName = file.replace('.md', '');

          agents.push({
            id: agentName,
            name: agentName,
            description: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
            systemPrompt: content
          });
        }
      }
    } catch (error) {
      this.emit('error', {
        source: 'kilocode_provider',
        error: {
          code: 'AGENT_LOAD_FAILED',
          message: `Failed to load agents from ${agentsPath}`,
          details: error
        }
      });
    }

    return agents;
  }

  /**
   * Send input to a session
   */
  async sendInput(sessionId: string, input: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const stdin = session.process.stdin;
    if (!stdin) {
      throw new Error(`Session ${sessionId} stdin not available`);
    }

    stdin.write(input + '\n');
    session.lastActivityTime = new Date();
    session.status = 'processing';

    this.emit('statusUpdate', {
      sessionId,
      status: 'processing',
      timestamp: new Date()
    });
  }

  /**
   * Interrupt a session
   */
  async interrupt(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Send interrupt signal (Ctrl+C)
    if (session.process.stdin) {
      session.process.stdin.write('\x03');
    }

    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, INTERRUPT_TIMEOUT_MS));

    // If still running, force kill
    if (session.process.killed === false && session.process.exitCode === null) {
      session.process.kill('SIGTERM');
    }

    session.status = 'completed';
    session.lastActivityTime = new Date();

    this.emit('processInterrupted', { sessionId, timestamp: new Date() });
    this.emit('statusUpdate', {
      sessionId,
      status: 'completed',
      timestamp: new Date()
    });
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Try graceful shutdown first
    if (session.process.stdin) {
      session.process.stdin.write('\x04'); // EOF
    }

    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, CLOSE_TIMEOUT_MS));

    // Force kill if still running
    if (session.process.killed === false && session.process.exitCode === null) {
      session.process.kill('SIGTERM');
    }

    session.status = 'completed';
    session.lastActivityTime = new Date();

    this.sessions.delete(sessionId);

    this.emit('processStopped', { sessionId, timestamp: new Date() });
    this.emit('statusUpdate', {
      sessionId,
      status: 'completed',
      timestamp: new Date()
    });
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return 'not_found';
    }

    return session.status;
  }

  /**
   * Get session metrics
   */
  async getSessionMetrics(sessionId: string): Promise<any | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId,
      status: session.status,
      workingDirectory: session.workingDirectory,
      startTime: session.startTime,
      lastActivityTime: session.lastActivityTime,
      uptime: Date.now() - session.startTime.getTime(),
      isAlive: session.process.killed === false && session.process.exitCode === null
    };
  }

  /**
   * Setup stream parsers for stdout and stderr
   */
  private setupStreamParsers(session: KiloCodeProcess): void {
    let buffer = '';

    // Parse stdout
    session.process.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const output: KiloCodeOutput = JSON.parse(line);
            this.handleKiloCodeOutput(session.sessionId, output);
          } catch (error) {
            // Not a JSON line, might be text output
            if (line.trim()) {
              this.emit('delta', {
                type: StreamEventType.DELTA,
                role: 'assistant',
                content: line,
                timestamp: new Date()
              });
            }
          }
        }
      }
    });

    // Parse stderr
    session.process.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      if (text.trim()) {
        this.emit('error', {
          type: StreamEventType.ERROR,
          role: 'system',
          content: text,
          timestamp: new Date(),
          error: {
            code: 'STDERR',
            message: text
          }
        });
      }
    });

    // Handle process exit
    session.process.on('exit', (code, signal) => {
      session.status = code === 0 ? 'completed' : 'error';
      session.lastActivityTime = new Date();

      this.emit('processStopped', {
        sessionId: session.sessionId,
        exitCode: code,
        signal,
        timestamp: new Date()
      });

      if (code !== 0) {
        this.emit('error', {
          type: StreamEventType.ERROR,
          role: 'system',
          content: `KiloCode process exited with code ${code}`,
          timestamp: new Date(),
          error: {
            code: 'PROCESS_EXIT',
            message: `Process exited with code ${code}`,
            details: { signal }
          }
        });
      }
    });

    // Handle process error
    session.process.on('error', (error) => {
      session.status = 'error';
      session.lastActivityTime = new Date();

      this.emit('error', {
        type: StreamEventType.ERROR,
        role: 'system',
        content: error.message,
        timestamp: new Date(),
        error: {
          code: 'PROCESS_ERROR',
          message: error.message,
          details: error
        }
      });
    });
  }

  /**
   * Handle KiloCode output and map to StreamEvent
   */
  private handleKiloCodeOutput(sessionId: string, output: KiloCodeOutput): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.lastActivityTime = new Date();

    switch (output.type) {
      case 'say':
        if (output.say === 'text' && output.content) {
          this.emit('delta', {
            type: StreamEventType.DELTA,
            role: 'assistant',
            content: output.content,
            timestamp: new Date()
          });

          session.status = 'processing';
        }
        break;

      case 'tool_call':
        if (output.metadata?.toolName) {
          this.emit('tool_call', {
            type: StreamEventType.TOOL_CALL,
            role: 'assistant',
            content: JSON.stringify(output.metadata.toolInput),
            timestamp: new Date(),
            metadata: {
              toolName: output.metadata.toolName,
              toolInput: output.metadata.toolInput
            }
          });

          session.status = 'processing';
        }
        break;

      case 'error':
        session.status = 'error';
        this.emit('error', {
          type: StreamEventType.ERROR,
          role: 'system',
          content: output.error?.message || 'Unknown error',
          timestamp: new Date(),
          error: {
            code: output.error?.code || 'KILOCODE_ERROR',
            message: output.error?.message || 'Unknown error',
            details: output
          }
        });
        break;

      case 'status':
        session.status = 'idle';
        this.emit('statusUpdate', {
          type: StreamEventType.STATUS,
          role: 'system',
          content: output.content,
          timestamp: new Date()
        });
        break;

      case 'done':
        session.status = 'completed';
        this.emit('statusUpdate', {
          sessionId,
          status: 'completed',
          timestamp: new Date()
        });
        break;

      case 'welcome':
        // Ignore welcome messages
        break;

      default:
        // Unknown type, emit as delta
        if (output.content) {
          this.emit('delta', {
            type: StreamEventType.DELTA,
            role: 'assistant',
            content: output.content,
            timestamp: new Date()
          });
        }
    }
  }

  /**
   * Inject system prompt from agent file
   */
  private async injectSystemPrompt(sessionId: string, agentId: string): Promise<void> {
    try {
      const agentPath = path.join(this.agentsPath, `${agentId}.md`);

      if (fs.existsSync(agentPath)) {
        const systemPrompt = fs.readFileSync(agentPath, 'utf-8');
        await this.sendInput(sessionId, systemPrompt);
      }
    } catch (error) {
      this.emit('warning', {
        source: 'kilocode_provider',
        message: `Failed to inject system prompt for agent ${agentId}`,
        details: error
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `kilocode_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
