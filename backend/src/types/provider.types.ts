/**
 * Core Provider Types
 *
 * Multi-tool provider abstraction layer for Agentic-Kanban-Board
 * Defines the contract that all AI tool providers must implement
 */

/**
 * Supported tool types
 */
export enum ToolType {
  CLAUDE = 'claude',
  OPENCODE = 'opencode',
  CURSOR = 'cursor',
  KILOCODE = 'kilocode',
  CODEX = 'codex'
}

/**
 * Tool capabilities metadata
 */
export interface ToolCapabilities {
  /** Whether this tool supports agent-based prompting */
  supportsAgents: boolean;

  /** Whether sessions can be resumed from previous state */
  supportsResume: boolean;

  /** Whether sessions can be continued with new input */
  supportsContinue: boolean;

  /** Whether the tool supports real-time streaming output */
  realTimeStreaming: boolean;

  /** List of native tools supported by this provider */
  supportedTools: string[];

  /** Maximum context window in tokens (if applicable) */
  maxContextTokens?: number;

  /** Whether the tool requires network connectivity */
  requiresNetwork?: boolean;

  /** Whether the tool runs locally (CLI) or remotely (API) */
  isLocal: boolean;
}

/**
 * Standardized stream event types across all providers
 */
export enum StreamEventType {
  DELTA = 'delta',
  MESSAGE = 'message',
  TOOL_CALL = 'tool_call',
  SESSION_ID = 'session_id',
  THINKING = 'thinking',
  ERROR = 'error',
  STATUS = 'status'
}

/**
 * Standardized stream event structure
 * All providers must emit events in this format
 */
export interface StreamEvent {
  type: StreamEventType;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  data?: any;
  timestamp: Date;

  // Optional metadata for tool calls
  metadata?: {
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
    toolId?: string;
    fileOperation?: 'read' | 'write' | 'edit' | 'delete' | 'list' | 'search';
    filePath?: string;
    lineNumbers?: { start: number; end: number };
    messageId?: string;
    isPartial?: boolean;
    sequenceId?: string;
    isComplete?: boolean;
  };

  // Error information if event type is ERROR
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Session options passed when creating a new session
 */
export interface SessionOptions {
  title: string;
  workingDirectory: string;
  task?: string;
  agentId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;

  // Tool-specific options
  toolSpecific?: Record<string, any>;
}

/**
 * Resume context for resuming an existing session
 */
export interface ResumeContext {
  previousSessionId: string;
  workingDirectory?: string;
  continueChat?: boolean;
  toolSpecific?: Record<string, any>;
}

/**
 * Agent representation
 */
export interface Agent {
  id: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Process handle for CLI-based tools
 */
export interface ProcessHandle {
  pid: number;
  stdin: NodeJS.WritableStream;
  stdout: NodeJS.ReadableStream;
  stderr: NodeJS.ReadableStream;
  kill: (signal?: NodeJS.Signals) => void;
  isAlive: () => boolean;
}

/**
 * Tool session abstraction
 * Represents an active session with a specific tool provider
 */
export interface ToolSession {
  id: string;
  toolType: ToolType;
  createdAt: Date;
  isActive: boolean;

  // Provider-specific session data
  data?: Record<string, any>;

  // Methods
  sendInput(input: string): Promise<void>;
  interrupt(): Promise<void>;
  close(): Promise<void>;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback?: (...args: any[]) => void): void;
}

/**
 * Provider configuration interface
 * Each provider defines its own config shape
 */
export interface ProviderConfig {
  claude?: ClaudeProviderConfig;
  opencode?: OpenCodeProviderConfig;
  cursor?: CursorProviderConfig;
  kilocode?: KiloCodeProviderConfig;
  codex?: CodexProviderConfig;

  // Allow future providers
  [key: string]: any;
}

/**
 * Claude-specific configuration
 */
export interface ClaudeProviderConfig {
  executablePath?: string;
  timeout?: number;
  flags?: string[];
  maxMemory?: number;
}

/**
 * OpenCode-specific configuration
 */
export interface OpenCodeProviderConfig {
  executable?: string;
  configDir?: string;
  configPath?: string;
  model?: string;
  enabled?: boolean;
  timeout?: number;
}

/**
 * Cursor-specific configuration (MCP-based)
 */
export interface CursorProviderConfig {
  mcpCommand?: string;
  mcpArgs?: string[];
  timeout?: number;
}

/**
 * KiloCode-specific configuration
 */
export interface KiloCodeProviderConfig {
  executable?: string;
  timeout?: number;
  flags?: string[];
}

/**
 * Codex-specific configuration
 */
export interface CodexProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}
