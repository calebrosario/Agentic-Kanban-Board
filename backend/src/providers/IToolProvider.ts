import { EventEmitter } from 'events';
import {
  ToolType,
  SessionOptions,
  ResumeContext,
  StreamEvent,
  ToolCapabilities,
  Agent,
  ToolSession
} from '../types/provider.types';

/**
 * IToolProvider
 *
 * Core interface that all AI tool providers must implement.
 * This abstraction enables multi-tool support by providing a uniform contract
 * for session management, execution, and agent loading.
 *
 * @see provider.types.ts for complete type definitions
 */
export interface IToolProvider extends EventEmitter {
  /**
   * Unique identifier for this provider
   * @readonly
   */
  readonly id: ToolType;

  /**
   * Human-readable display name
   * @readonly
   */
  readonly displayName: string;

  /**
   * Capabilities and feature support for this provider
   * @readonly
   */
  readonly capabilities: ToolCapabilities;

  /**
   * Initialize the provider with configuration
   * Called once when provider is first needed
   */
  initialize(config: any): Promise<void>;

  /**
   * Clean up provider resources
   * Called when shutting down or switching providers
   */
  shutdown(): Promise<void>;

  /**
   * Create a new session with this provider
   *
   * @param options - Session configuration (working directory, task, agent, etc.)
   * @returns Promise resolving to ToolSession
   */
  createSession(options: SessionOptions): Promise<ToolSession>;

  /**
   * Resume an existing session from previous state
   *
   * @param context - Resume context with previous session ID and options
   * @returns Promise resolving to ToolSession
   */
  resumeSession(context: ResumeContext): Promise<ToolSession>;

  /**
   * Continue an existing session with new user input
   *
   * @param sessionId - The session to continue
   * @param input - New user input to send to the session
   * @returns AsyncIterable of StreamEvent
   */
  continueSession(
    sessionId: string,
    input: string
  ): AsyncIterable<StreamEvent>;

  /**
   * Load available agents from the configured agents directory
   *
   * @param agentsPath - Path to the agents directory
   * @returns Promise resolving to array of Agent objects
   */
  loadAgents(agentsPath: string): Promise<Agent[]>;

  /**
   * Send input to an active session
   *
   * @param sessionId - The session to send input to
   * @param input - The input string to send
   * @returns Promise resolving when input is sent
   */
  sendInput(sessionId: string, input: string): Promise<void>;

  /**
   * Interrupt an active session
   *
   * @param sessionId - The session to interrupt
   * @returns Promise resolving when interrupt is sent
   */
  interrupt(sessionId: string): Promise<void>;

  /**
   * Close and cleanup a session
   *
   * @param sessionId - The session to close
   * @returns Promise resolving when session is closed
   */
  closeSession(sessionId: string): Promise<void>;

  /**
   * Get the current status of a session
   *
   * @param sessionId - The session to query
   * @returns Session status (e.g., 'running', 'idle', 'error')
   */
  getSessionStatus(sessionId: string): Promise<string>;

  /**
   * Get metrics for a session (CPU, memory, etc.)
   *
   * @param sessionId - The session to query
   * @returns Metrics object or null if not available
   */
  getSessionMetrics(sessionId: string): Promise<any | null>;
}
