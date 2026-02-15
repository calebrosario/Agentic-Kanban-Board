import { EventEmitter } from 'events';
import { StreamEvent, StreamEventType } from '../types/provider.types';

/**
 * OpenCode JSONL line structure
 * Based on OpenCode CLI JSONL output format
 */
interface OpenCodeJSONLLine {
  type: 'content' | 'tool_use' | 'thinking' | 'status' | 'agent' | 'background_task' | 'todo' | 'error';
  role?: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  tool_name?: string;
  tool_input?: any;
  tool_result?: any;
  tool_id?: string;
  status?: string;
  agent?: string;
  agent_action?: 'start' | 'complete';
  background_task_id?: string;
  background_task_status?: 'started' | 'completed' | 'failed';
  background_task_description?: string;
  todo_action?: 'update' | 'add' | 'complete' | 'remove';
  todo_items?: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority?: 'high' | 'medium' | 'low';
  }>;
  error?: string;
  error_code?: string;
  error_details?: any;
  timestamp?: string;
  session_id?: string;
}

/**
 * Parse options for OpenCodeStreamParser
 */
interface ParserOptions {
  sessionId: string;
  emitRawEvents?: boolean;
}

/**
 * OpenCodeStreamParser
 *
 * Parses JSONL (JSON Lines) streaming output from OpenCode CLI and converts
 * it to standardized StreamEvent objects. Handles oh-my-opencode agent orchestration
 * events and emits them as structured events.
 *
 * Usage:
 * ```typescript
 * const parser = new OpenCodeStreamParser({ sessionId: 'session-123' });
 * parser.on('event', (event) => console.log(event));
 * parser.parse(jsonLine);
 * ```
 */
export class OpenCodeStreamParser extends EventEmitter {
  private sessionId: string;
  private emitRaw: boolean;
  private buffer: string = '';

  constructor(options: ParserOptions) {
    super();
    this.sessionId = options.sessionId;
    this.emitRaw = options.emitRawEvents || false;
  }

  /**
   * Parse a chunk of JSONL data
   * Handles partial lines across chunks
   *
   * @param chunk - Data chunk from OpenCode CLI stdout
   */
  parse(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        const data: OpenCodeJSONLLine = JSON.parse(line);
        const event = this.convertToStreamEvent(data);

        if (this.emitRaw) {
          this.emit('raw', data);
        }

        this.emit('event', event);
      } catch (error) {
        this.emit('error', {
          error: `Failed to parse JSONL line: ${error}`,
          line: line.slice(0, 200),
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Convert OpenCode JSONL line to standardized StreamEvent
   *
   * @param data - Parsed JSONL line from OpenCode
   * @returns Standardized StreamEvent
   */
  private convertToStreamEvent(data: OpenCodeJSONLLine): StreamEvent {
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    switch (data.type) {
      case 'content':
        return {
          type: StreamEventType.DELTA,
          role: data.role || 'assistant',
          content: data.content || '',
          timestamp
        };

      case 'tool_use':
        return {
          type: StreamEventType.TOOL_CALL,
          role: data.role || 'assistant',
          content: data.content,
          timestamp,
          metadata: {
            toolName: data.tool_name,
            toolInput: data.tool_input,
            toolOutput: data.tool_result,
            toolId: data.tool_id || data.tool_name,
            messageId: data.session_id
          }
        };

      case 'thinking':
        return {
          type: StreamEventType.THINKING,
          role: 'assistant',
          content: data.content,
          timestamp,
          metadata: {
            isPartial: true
          }
        };

      case 'status':
        return {
          type: StreamEventType.STATUS,
          role: 'system',
          content: data.status || 'unknown',
          timestamp,
          data: {
            status: data.status,
            sessionId: data.session_id || this.sessionId
          }
        };

      case 'agent':
        return {
          type: StreamEventType.STATUS,
          role: 'system',
          content: this.formatAgentMessage(data.agent, data.agent_action),
          timestamp,
          data: {
            agent: data.agent,
            action: data.agent_action === 'start' ? 'agent_start' : 'agent_complete',
            sessionId: data.session_id || this.sessionId
          }
        };

      case 'background_task':
        return {
          type: StreamEventType.STATUS,
          role: 'system',
          content: this.formatBackgroundTaskMessage(data.background_task_id, data.background_task_status, data.background_task_description),
          timestamp,
          data: {
            taskId: data.background_task_id,
            status: data.background_task_status === 'started' ? 'background_task_start' : 'background_task_complete',
            description: data.background_task_description,
            sessionId: data.session_id || this.sessionId
          }
        };

      case 'todo':
        return {
          type: StreamEventType.STATUS,
          role: 'system',
          content: this.formatTodoMessage(data.todo_action, data.todo_items),
          timestamp,
          data: {
            action: data.todo_action,
            items: data.todo_items,
            sessionId: data.session_id || this.sessionId
          }
        };

      case 'error':
        return {
          type: StreamEventType.ERROR,
          role: 'system',
          content: data.error || 'Unknown error',
          timestamp,
          error: {
            code: data.error_code || 'OPENCODE_ERROR',
            message: data.error || 'Unknown error',
            details: data.error_details
          },
          data: {
            sessionId: data.session_id || this.sessionId
          }
        };

      default:
        return {
          type: StreamEventType.MESSAGE,
          role: 'system',
          content: `Unknown event type: ${data.type}`,
          timestamp,
          data: { rawData: data }
        };
    }
  }

  /**
   * Format agent event message
   */
  private formatAgentMessage(agent: string | undefined, action: 'start' | 'complete' | undefined): string {
    if (!agent) return 'Agent event';

    const actionText = action === 'start' ? 'started' : 'completed';
    return `Agent ${agent} ${actionText}`;
  }

  /**
   * Format background task event message
   */
  private formatBackgroundTaskMessage(
    taskId: string | undefined,
    status: 'started' | 'completed' | 'failed' | undefined,
    description: string | undefined
  ): string {
    if (!taskId) return 'Background task event';

    const statusText = status || 'unknown';
    const descText = description ? `: ${description}` : '';
    return `Background task ${taskId} ${statusText}${descText}`;
  }

  /**
   * Format todo event message
   */
  private formatTodoMessage(
    action: 'update' | 'add' | 'complete' | 'remove' | undefined,
    items: Array<any> | undefined
  ): string {
    if (!action) return 'Todo event';

    const itemCount = items?.length || 0;
    return `Todo ${action}${itemCount > 0 ? ` (${itemCount} items)` : ''}`;
  }

  /**
   * Clear the buffer and reset parser state
   */
  reset(): void {
    this.buffer = '';
  }

  /**
   * Get the current buffer content (useful for debugging)
   */
  getBuffer(): string {
    return this.buffer;
  }
}
