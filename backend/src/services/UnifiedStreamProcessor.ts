import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as readline from 'readline';
import { ClaudeStreamMessage, ToolUsageRecord } from '../types/process.types';
import { MessageRepository } from '../repositories/MessageRepository';
import { logger } from '../utils/logger';
import { getUnifiedProcessorConfig, UnifiedProcessorConfig } from '../config/unified-processor.config';

/**
 * 統一串流處理器 - 解決重複儲存問題
 * 
 * 核心設計原則：
 * 1. 單一處理點：只有一個地方處理 Claude 輸出
 * 2. 即時串流：發送給前端並統一儲存到資料庫  
 * 3. 學習 vibe-kanban：忽略不必要的訊息類型（如 result）
 * 4. 完整工具資訊：顯示工具名稱、參數、執行狀態
 */
export class UnifiedStreamProcessor extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private messageRepository: MessageRepository;
  private config: UnifiedProcessorConfig;
  
  // 訊息管理
  private processedMessageIds: Set<string> = new Set();
  private messageBuffer: Map<string, MessageBuffer> = new Map();
  private currentSequenceId: string | null = null;
  
  // 工具使用追蹤
  private toolUsageStack: Map<string, ToolUsageRecord[]> = new Map();
  
  
  constructor(config?: Partial<UnifiedProcessorConfig>) {
    super();
    this.messageRepository = new MessageRepository();
    this.config = config ? { ...getUnifiedProcessorConfig(), ...config } : getUnifiedProcessorConfig();
    
    if (this.config.debug.verbose) {
      logger.info('UnifiedStreamProcessor initialized with config:', this.config);
    }
  }

  /**
   * 啟動 Claude 進程並處理串流
   */
  async startProcess(
    sessionId: string,
    command: string,
    args: string[],
    workingDir: string,
    prompt: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 清理 session 狀態
        this.cleanupSession(sessionId);
        
        // 使用 spawn 啟動進程
        this.childProcess = spawn(command, args, {
          cwd: workingDir,
          shell: process.platform === 'win32',
          env: {
            ...process.env,
            CLAUDE_SESSION_ID: sessionId,
            NODE_NO_WARNINGS: '1'
          }
        });

        if (!this.childProcess.stdout || !this.childProcess.stderr) {
          throw new Error('Failed to create process streams');
        }

        // 設定進程 PID
        const pid = this.childProcess.pid;
        if (pid) {
          this.emit('processStarted', { sessionId, pid });
        }

        // 創建 readline 介面來處理 stdout
        const rl = readline.createInterface({
          input: this.childProcess.stdout,
          crlfDelay: Infinity
        });

        // 逐行處理輸出 - 統一處理點
        rl.on('line', (line) => {
          this.processLine(sessionId, line);
        });

        // 處理 stderr
        const rlErr = readline.createInterface({
          input: this.childProcess.stderr,
          crlfDelay: Infinity
        });

        rlErr.on('line', (line) => {
          logger.warn(`Claude stderr: ${line}`);
          this.emit('error', {
            sessionId,
            error: line,
            timestamp: new Date()
          });
        });

        // 寫入 prompt
        if (this.childProcess.stdin) {
          this.childProcess.stdin.write(prompt);
          this.childProcess.stdin.end();
        }

        // 處理進程結束
        this.childProcess.on('close', (code) => {
          // 完成所有緩衝的訊息並儲存
          this.flushAndSaveBuffers(sessionId);
          
          this.emit('processExit', { sessionId, code });
          resolve();
        });

        // 處理錯誤
        this.childProcess.on('error', (error) => {
          logger.error(`Process error: ${error.message}`);
          this.emit('error', {
            sessionId,
            error: error.message,
            errorType: 'PROCESS_ERROR',
            timestamp: new Date()
          });
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 處理單行輸出 - 統一處理點
   */
  private processLine(sessionId: string, line: string): void {
    if (!line.trim()) return;

    try {
      const json = JSON.parse(line);
      
      if (this.config.debug.verbose) {
        logger.debug(`Stream JSON received: ${json.type}`, json);
      }
      
      this.processStreamJson(sessionId, json);
    } catch (parseError) {
      // 如果不是 JSON，可能是普通文字輸出
      logger.debug(`Non-JSON output: ${line}`);
      this.handleRawOutput(sessionId, line);
    }
  }

  /**
   * 處理 stream-json 格式的訊息 - 核心邏輯
   */
  private processStreamJson(sessionId: string, json: any): void {
    const timestamp = new Date();
    
    // 提取並儲存 session ID
    if (json.session_id) {
      this.emit('sessionId', { sessionId, claudeSessionId: json.session_id });
    }

    // 生成或提取訊息 ID
    const messageId = this.generateMessageId(json);
    
    // 學習 vibe-kanban：忽略不必要的訊息類型
    if (this.shouldIgnoreMessage(json)) {
      if (this.config.debug.verbose) {
        logger.debug(`Ignoring message type: ${json.type}`);
      }
      return;
    }

    // 根據訊息類型統一處理
    switch (json.type) {
      case 'message_start':
        this.handleMessageStart(sessionId, json, messageId);
        break;
        
      case 'message_delta':
        this.handleMessageDelta(sessionId, json);
        break;
        
      case 'message_stop':
        this.handleMessageStop(sessionId, json);
        break;
        
      case 'content_block_start':
        this.handleContentBlockStart(sessionId, json);
        break;
        
      case 'content_block_delta':
        // 處理內容塊增量，暫時跳過
        logger.debug('Content block delta received', { sessionId, json });
        break;
        
      case 'content_block_stop':
        this.handleContentBlockStop(sessionId, json);
        break;
        
      case 'assistant':
        this.handleAssistantMessage(sessionId, json, messageId);
        break;
        
      case 'user':
        this.handleUserMessage(sessionId, json, messageId);
        break;
        
      case 'system':
        this.handleSystemMessage(sessionId, json, messageId);
        break;
        
      case 'error':
        this.handleErrorMessage(sessionId, json);
        break;
        
      default:
        logger.debug(`Unhandled message type: ${json.type}`, json);
    }
  }

  /**
   * 生成訊息 ID（簡化版本，不處理重複）
   */
  private generateMessageId(json: any): string {
    // 優先使用官方 ID
    if (json.id) return json.id;
    if (json.message?.id) return json.message.id;
    
    // 根據內容和類型生成 ID
    const content = JSON.stringify(json).slice(0, 100);
    const hash = Buffer.from(content).toString('base64').slice(0, 8);
    return `${json.type}_${Date.now()}_${hash}`;
  }

  /**
   * 檢查是否應該忽略訊息（學習 vibe-kanban）
   */
  private shouldIgnoreMessage(json: any): boolean {
    // 根據配置忽略指定類型
    if (this.config.filtering.ignoreTypes.includes(json.type)) {
      if (this.config.debug.verbose) {
        logger.debug(`Ignoring message type from config: ${json.type}`);
      }
      return true;
    }
    
    // 忽略空的系統訊息
    if (this.config.filtering.ignoreEmpty && json.type === 'system' && !json.message && !json.subtype) {
      return true;
    }
    
    return false;
  }

  /**
   * 處理助手訊息 - 統一處理
   */
  private handleAssistantMessage(sessionId: string, json: any, messageId: string): void {
    if (!json.message?.content) return;
    
    const contentArray = Array.isArray(json.message.content) ? json.message.content : [json.message.content];
    
    for (const contentItem of contentArray) {
      if (contentItem.type === 'text' && contentItem.text) {
        // 即時發送給前端
        const realtimeMessage: ClaudeStreamMessage = {
          sessionId,
          type: 'assistant',
          content: contentItem.text,
          timestamp: new Date(),
          metadata: {
            messageId,
            isComplete: true
          }
        };
        
        this.emit('message', realtimeMessage);
        
        // 儲存到資料庫
        this.saveMessage(sessionId, 'assistant', contentItem.text, { messageId });
        
      } else if (contentItem.type === 'tool_use') {
        // 處理工具使用
        this.handleToolUse(sessionId, contentItem, messageId);
      }
    }
  }

  /**
   * 處理工具使用
   */
  private handleToolUse(sessionId: string, toolUse: any, messageId: string): void {
    const toolName = toolUse.name || 'unknown';
    const toolInput = toolUse.input;
    const toolId = toolUse.id || `tool_${Date.now()}`;
    const toolDescription = this.generateToolDescription(toolName, toolInput);
    
    if (this.config.debug.verbose) {
      logger.debug(`Tool use: ${toolName} (${toolId})`, { description: toolDescription });
    }
    
    
    // 即時發送工具使用訊息給前端
    const toolMessage: ClaudeStreamMessage = {
      sessionId,
      type: 'tool_use',
      content: toolDescription,
      timestamp: new Date(),
      metadata: {
        messageId,
        toolName,
        toolId,
        toolInput,
        toolStatus: 'start'
      }
    };
    
    this.emit('message', toolMessage);
    
    // 儲存工具使用記錄
    this.saveMessage(sessionId, 'tool_use', toolDescription, {
      messageId,
      toolName,
      toolId,
      toolInput
    });
  }

  /**
   * 生成工具描述（更接近 vibe-kanban 的簡潔方式）
   */
  private generateToolDescription(toolName: string, input: any): string {
    switch (toolName.toLowerCase()) {
      case 'read':
        const readPath = input?.file_path || input?.path || '';
        return readPath ? `Read: \`${readPath}\`` : 'File read';
      
      case 'write':
      case 'edit':
      case 'multiedit':
        const writePath = input?.file_path || input?.path || '';
        return writePath ? `Write: \`${writePath}\`` : 'File write';
      
      case 'bash':
        const command = input?.command || '';
        return command ? `Bash: \`${command}\`` : 'Command execution';
      
      case 'grep':
        const pattern = input?.pattern || '';
        return pattern ? `\`${pattern}\`` : 'Search operation';
      
      case 'websearch':
        const query = input?.query || '';
        return query ? `\`${query}\`` : 'Web search';
      
      case 'glob':
        const globPattern = input?.pattern || '*';
        const globPath = input?.path;
        if (globPath) {
          return `Find files: \`${globPattern}\` in \`${this.makePathRelative(globPath)}\``;
        }
        return `Find files: \`${globPattern}\``;
      
      case 'ls':
        const lsPath = input?.path;
        if (lsPath) {
          const relativePath = this.makePathRelative(lsPath);
          return relativePath ? `List directory: \`${relativePath}\`` : 'List directory';
        }
        return 'List directory';
      
      case 'todoread':
      case 'todowrite':
        // 學習 vibe-kanban 顯示完整 todo 內容
        if (input?.todos && Array.isArray(input.todos)) {
          const todoItems: string[] = [];
          for (const todo of input.todos) {
            if (todo.content) {
              const status = todo.status || 'pending';
              const statusEmoji = this.getStatusEmoji(status);
              const priority = todo.priority || 'medium';
              todoItems.push(`${statusEmoji} ${todo.content} (${priority})`);
            }
          }
          if (todoItems.length > 0) {
            return `TODO List:\n${todoItems.join('\n')}`;
          }
        }
        return 'Managing TODO list';
      
      case 'task':
        const taskDesc = input?.description || input?.prompt;
        return taskDesc || 'Task creation';
      
      case 'exitplanmode':
        const plan = input?.plan;
        return plan || 'Plan presentation';
      
      default:
        return toolName;
    }
  }

  /**
   * 獲取狀態 emoji（學習 vibe-kanban）
   */
  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'pending':
      case 'todo': return '⏳';
      default: return '📝';
    }
  }

  /**
   * 將絕對路徑轉為相對路徑（簡化版本）
   */
  private makePathRelative(path: string): string {
    if (!path) return '';
    
    // 如果已經是相對路徑，直接返回
    if (!path.startsWith('/') && !path.match(/^[A-Za-z]:/)) {
      return path;
    }
    
    // 簡單的路徑處理 - 可以後續改進
    const segments = path.split(/[/\\]/);
    const lastFew = segments.slice(-2).join('/');
    return lastFew || path;
  }


  /**
   * 處理訊息開始
   */
  private handleMessageStart(sessionId: string, json: any, messageId: string): void {
    this.currentSequenceId = messageId;
    this.messageBuffer.set(messageId, {
      sessionId,
      content: [],
      startTime: new Date(),
      metadata: { messageId }
    });
    
    this.emit('messageStart', {
      sessionId,
      messageId,
      type: json.message?.role || 'assistant',
      timestamp: new Date()
    });
  }

  /**
   * 處理訊息片段
   */
  private handleMessageDelta(sessionId: string, json: any): void {
    if (!this.currentSequenceId) return;
    
    const delta = json.delta;
    if (delta?.text) {
      // 累積文字
      const buffer = this.messageBuffer.get(this.currentSequenceId);
      if (buffer) {
        buffer.content.push(delta.text);
        
        // 即時發送片段
        const message: ClaudeStreamMessage = {
          sessionId,
          type: 'assistant',
          content: delta.text,
          timestamp: new Date(),
          metadata: {
            isPartial: true,
            sequenceId: this.currentSequenceId
          }
        };
        
        this.emit('message', message);
      }
    }
  }

  /**
   * 處理訊息結束
   */
  private handleMessageStop(sessionId: string, json: any): void {
    if (!this.currentSequenceId) return;
    
    const buffer = this.messageBuffer.get(this.currentSequenceId);
    if (buffer) {
      const fullContent = buffer.content.join('');
      
      // 儲存完整訊息
      this.saveMessage(sessionId, 'assistant', fullContent, {
        messageId: this.currentSequenceId,
        duration: Date.now() - buffer.startTime.getTime()
      });
      
      // 發送完成事件
      this.emit('messageComplete', {
        sessionId,
        messageId: this.currentSequenceId,
        content: fullContent,
        timestamp: new Date()
      });
      
      // 清理緩衝
      this.messageBuffer.delete(this.currentSequenceId);
      this.currentSequenceId = null;
    }
  }

  /**
   * 處理內容區塊開始
   */
  private handleContentBlockStart(sessionId: string, json: any): void {
    const block = json.content_block;
    
    if (block?.type === 'tool_use') {
      const toolName = block.name;
      const toolInput = block.input;
      
      // 記錄工具使用開始
      this.emit('toolUseStart', {
        sessionId,
        toolName,
        input: toolInput,
        timestamp: new Date()
      });
    }
  }

  /**
   * 處理內容區塊結束
   */
  private handleContentBlockStop(sessionId: string, json: any): void {
    const block = json.content_block;
    
    if (block?.type === 'tool_use') {
      this.emit('toolUseComplete', {
        sessionId,
        toolName: block.name,
        timestamp: new Date()
      });
    }
  }

  /**
   * 處理用戶訊息
   */
  private handleUserMessage(sessionId: string, json: any, messageId: string): void {
    if (!json.message?.content) return;
    
    const contentArray = Array.isArray(json.message.content) ? json.message.content : [json.message.content];
    
    for (const contentItem of contentArray) {
      if (contentItem.type === 'tool_result') {
        // 直接處理 tool_result，顯示工具 ID 和結果
        const toolId = contentItem.tool_use_id;
        
        let resultContent: string;
        if (contentItem.is_error) {
          resultContent = `❌ 工具 ${toolId} 執行失敗: ${contentItem.content}`;
        } else {
          resultContent = `✅ 工具 ${toolId} 執行完成`;
        }
        
        const toolResultMessage: ClaudeStreamMessage = {
          sessionId,
          type: 'tool_use',
          content: resultContent,
          timestamp: new Date(),
          metadata: {
            messageId,
            toolStatus: contentItem.is_error ? 'error' : 'complete',
            toolId: contentItem.tool_use_id,
            toolOutput: contentItem.content,
            isError: contentItem.is_error
          }
        };
        
        this.emit('message', toolResultMessage);
        
        // 儲存工具結果
        this.saveMessage(sessionId, 'tool_use', resultContent, {
          messageId,
          toolId: contentItem.tool_use_id,
          isError: contentItem.is_error,
          output: contentItem.content
        });
        
      } else if (contentItem.type === 'text') {
        // 用戶文字訊息（通常已在發送時處理，這裡跳過避免重複）
        logger.debug('Skipping user text message from stream (already sent)');
      }
    }
  }

  /**
   * 處理系統訊息
   */
  private handleSystemMessage(sessionId: string, json: any, messageId: string): void {
    let content = '';
    
    if (json.subtype === 'init') {
      content = `系統初始化 - 模型: ${json.model || 'unknown'}`;
    } else {
      content = json.message || JSON.stringify(json);
    }
    
    // 即時發送系統訊息
    const systemMessage: ClaudeStreamMessage = {
      sessionId,
      type: 'system',
      content,
      timestamp: new Date(),
      metadata: { messageId }
    };
    
    this.emit('message', systemMessage);
    
    // 儲存系統訊息
    this.saveMessage(sessionId, 'system', content, { messageId });
  }

  /**
   * 處理錯誤訊息
   */
  private handleErrorMessage(sessionId: string, json: any): void {
    this.emit('error', {
      sessionId,
      error: json.error || json.message || 'Unknown error',
      errorType: json.error_type || 'UNKNOWN',
      details: json,
      timestamp: new Date()
    });
  }

  /**
   * 處理原始輸出
   */
  private handleRawOutput(sessionId: string, line: string): void {
    // 即時發送原始輸出
    this.emit('output', {
      sessionId,
      type: 'output',
      content: line,
      timestamp: new Date()
    });
    
    // 儲存原始輸出
    this.saveMessage(sessionId, 'output', line, { type: 'raw_output' });
  }

  /**
   * 儲存訊息到資料庫
   */
  private async saveMessage(
    sessionId: string,
    type: 'user' | 'assistant' | 'system' | 'tool_use' | 'thinking' | 'output' | 'error',
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      // 檢查內容是否為空
      if (!content.trim()) {
        return;
      }

      const saved = await this.messageRepository.save({
        sessionId,
        type,
        content,
        metadata
      });
      
      logger.info(`Message saved: ${saved.messageId} (${type}) - ${content.slice(0, 50)}...`);
      
    } catch (error) {
      logger.error('Failed to save message:', error);
    }
  }

  /**
   * 完成所有緩衝的訊息並儲存
   */
  private flushAndSaveBuffers(sessionId: string): void {
    // 完成所有未完成的訊息
    this.messageBuffer.forEach((buffer, messageId) => {
      if (buffer.content.length > 0) {
        const fullContent = buffer.content.join('');
        this.saveMessage(sessionId, 'assistant', fullContent, {
          messageId,
          isComplete: true,
          duration: Date.now() - buffer.startTime.getTime()
        });
      }
    });
    
    this.cleanupSession(sessionId);
  }

  /**
   * 清理 session 資料
   */
  private cleanupSession(sessionId: string): void {
    // 清理該 session 的所有資料
    const keysToDelete: string[] = [];
    this.messageBuffer.forEach((_, key) => {
      if (key.includes(sessionId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.messageBuffer.delete(key));
    
    this.toolUsageStack.delete(sessionId);
    
    // 清理處理過的訊息 ID（使用配置的限制）
    if (this.processedMessageIds.size > this.config.deduplication.maxProcessedIds) {
      const idsArray = Array.from(this.processedMessageIds);
      this.processedMessageIds.clear();
      // 保留後半部分
      const keepCount = Math.floor(this.config.deduplication.maxProcessedIds / 2);
      idsArray.slice(-keepCount).forEach(id => this.processedMessageIds.add(id));
      
      if (this.config.debug.verbose) {
        logger.debug(`Cleaned up processed message IDs, kept ${keepCount} out of ${idsArray.length}`);
      }
    }
  }

  /**
   * 中斷進程
   */
  interrupt(): void {
    if (this.childProcess) {
      this.childProcess.kill('SIGTERM');
      setTimeout(() => {
        if (this.childProcess) {
          this.childProcess.kill('SIGKILL');
        }
      }, 1000);
    }
  }

  /**
   * 清理指定 session
   */
  cleanup(sessionId: string): void {
    this.cleanupSession(sessionId);
  }
}

// 類型定義
interface MessageBuffer {
  sessionId: string;
  content: string[];
  startTime: Date;
  metadata: any;
}