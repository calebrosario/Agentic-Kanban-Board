import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as readline from 'readline';
import { ClaudeStreamMessage, ToolUsageRecord } from '../types/process.types';
import { logger } from '../utils/logger';

/**
 * 串流處理器 - 處理 Claude 的 stream-json 輸出
 * 
 * 主要功能：
 * 1. 使用 spawn 實現真正的即時串流
 * 2. 解析各種 Claude 輸出類型
 * 3. 累積訊息片段
 * 4. 智能儲存策略
 */
export class StreamProcessor extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private messageBuffer: Map<string, string[]> = new Map();
  private toolUsageStack: Map<string, ToolUsageRecord[]> = new Map();
  private currentSequenceId: string | null = null;
  private recentMessages: Map<string, ClaudeStreamMessage[]> = new Map(); // 去重用
  
  constructor() {
    super();
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

        // 逐行處理輸出
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
          // 完成所有緩衝的訊息
          this.flushBuffers(sessionId);
          
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
   * 處理單行輸出
   */
  private processLine(sessionId: string, line: string): void {
    if (!line.trim()) return;

    try {
      const json = JSON.parse(line);
      logger.info(`=== StreamProcessor received JSON: ${json.type} ===`, { 
        type: json.type,
        hasMessage: !!json.message,
        messageContent: json.message?.content?.slice(0, 100),
        fullJson: JSON.stringify(json).slice(0, 200)
      });
      this.handleStreamJson(sessionId, json);
    } catch (parseError) {
      // 如果不是 JSON，可能是普通文字輸出
      logger.debug(`Non-JSON output: ${line}`);
      this.emit('output', {
        sessionId,
        type: 'output',
        content: line,
        timestamp: new Date()
      });
    }
  }

  /**
   * 處理 stream-json 格式的訊息
   */
  private handleStreamJson(sessionId: string, json: any): void {
    const timestamp = new Date();
    
    // 提取 session ID
    if (json.session_id) {
      this.emit('sessionId', { sessionId, claudeSessionId: json.session_id });
    }

    // 根據訊息類型處理
    switch (json.type) {
      case 'message_start':
        this.handleMessageStart(sessionId, json);
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
        this.handleContentBlockDelta(sessionId, json);
        break;
        
      case 'content_block_stop':
        this.handleContentBlockStop(sessionId, json);
        break;
        
      case 'tool_use':
        this.handleToolUse(sessionId, json);
        break;
        
      case 'assistant':
        this.handleAssistantMessage(sessionId, json);
        break;
        
      case 'user':
        // 處理用戶訊息（可能包含工具結果）
        this.handleUserMessage(sessionId, json);
        break;
        
      case 'system':
        this.handleSystemMessage(sessionId, json);
        break;
        
      case 'error':
        this.handleErrorMessage(sessionId, json);
        break;
        
      default:
        logger.debug(`Unhandled message type: ${json.type}`, json);
    }
  }

  /**
   * 處理訊息開始
   */
  private handleMessageStart(sessionId: string, json: any): void {
    const messageId = json.message?.id || `msg_${Date.now()}`;
    this.currentSequenceId = messageId;
    this.messageBuffer.set(messageId, []);
    
    // 發送訊息開始事件
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
      const buffer = this.messageBuffer.get(this.currentSequenceId) || [];
      buffer.push(delta.text);
      this.messageBuffer.set(this.currentSequenceId, buffer);
      
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

  /**
   * 處理訊息結束
   */
  private handleMessageStop(sessionId: string, json: any): void {
    if (!this.currentSequenceId) return;
    
    // 獲取完整訊息
    const buffer = this.messageBuffer.get(this.currentSequenceId) || [];
    const fullContent = buffer.join('');
    
    // 發送完整訊息事件（用於儲存）
    const message: ClaudeStreamMessage = {
      sessionId,
      type: 'assistant',
      content: fullContent,
      timestamp: new Date(),
      metadata: {
        isComplete: true,
        sequenceId: this.currentSequenceId
      }
    };
    
    this.emit('messageComplete', message);
    
    // 清理緩衝
    this.messageBuffer.delete(this.currentSequenceId);
    this.currentSequenceId = null;
  }

  /**
   * 處理內容區塊開始（思考過程、工具使用等）
   */
  private handleContentBlockStart(sessionId: string, json: any): void {
    const block = json.content_block;
    
    if (block?.type === 'text' && block.text?.includes('<thinking>')) {
      // 開始思考過程
      this.emit('thinkingStart', {
        sessionId,
        timestamp: new Date()
      });
    } else if (block?.type === 'tool_use') {
      // 開始工具使用
      const toolRecord: ToolUsageRecord = {
        toolName: block.name,
        timestamp: new Date(),
        input: block.input,
        status: 'success'
      };
      
      const stack = this.toolUsageStack.get(sessionId) || [];
      stack.push(toolRecord);
      this.toolUsageStack.set(sessionId, stack);
      
      this.emit('toolUseStart', {
        sessionId,
        toolName: block.name,
        input: block.input,
        timestamp: new Date()
      });
    }
  }

  /**
   * 處理內容區塊片段
   */
  private handleContentBlockDelta(sessionId: string, json: any): void {
    const delta = json.delta;
    
    if (delta?.type === 'text_delta' && delta.text) {
      // 檢查是否為思考內容
      const isThinking = delta.text.includes('<thinking>') || 
                        this.isInThinkingMode(sessionId);
      
      const message: ClaudeStreamMessage = {
        sessionId,
        type: 'thinking',
        content: delta.text,
        timestamp: new Date(),
        metadata: {
          isThinking: true,
          isPartial: true
        }
      };
      
      if (isThinking) {
        this.emit('thinking', message);
      }
    }
  }

  /**
   * 處理內容區塊結束
   */
  private handleContentBlockStop(sessionId: string, json: any): void {
    const block = json.content_block;
    
    if (block?.type === 'tool_use') {
      // 工具使用完成
      const stack = this.toolUsageStack.get(sessionId) || [];
      const currentTool = stack[stack.length - 1];
      
      if (currentTool) {
        currentTool.duration = Date.now() - currentTool.timestamp.getTime();
        
        this.emit('toolUseComplete', {
          sessionId,
          toolName: currentTool.toolName,
          duration: currentTool.duration,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * 處理工具使用
   */
  private handleToolUse(sessionId: string, json: any): void {
    const toolCall = json.tool_call || json;
    
    // 解析工具資訊
    const toolName = toolCall.function?.name || toolCall.name || 'unknown';
    const toolInput = toolCall.function?.arguments || toolCall.input;
    
    // 特殊處理檔案操作
    const fileOperation = this.detectFileOperation(toolName, toolInput);
    
    const message: ClaudeStreamMessage = {
      sessionId,
      type: 'tool_use',
      content: `使用工具: ${toolName}`,
      timestamp: new Date(),
      metadata: {
        toolName,
        toolInput,
        toolStatus: 'start',
        ...fileOperation
      }
    };
    
    this.emit('message', message);
  }

  /**
   * 偵測檔案操作
   */
  private detectFileOperation(toolName: string, toolInput: any): any {
    const fileOperations: Record<string, string> = {
      'Read': 'read',
      'Write': 'write',
      'Edit': 'edit',
      'MultiEdit': 'edit',
      'Delete': 'delete',
      'LS': 'list',
      'Glob': 'search'
    };
    
    const operation = fileOperations[toolName];
    if (!operation) return {};
    
    // 嘗試提取檔案路徑
    let filePath = '';
    if (typeof toolInput === 'object' && toolInput !== null) {
      filePath = toolInput.file_path || toolInput.path || toolInput.filename || '';
      
      // 對於 Glob，也提取 pattern
      if (toolName === 'Glob' && toolInput.pattern) {
        filePath = `${filePath ? filePath + '/' : ''}${toolInput.pattern}`;
      }
    } else if (typeof toolInput === 'string') {
      filePath = toolInput;
    }
    
    return {
      fileOperation: operation,
      filePath
    };
  }

  /**
   * 處理助手訊息（向後相容）
   */
  private handleAssistantMessage(sessionId: string, json: any): void {
    if (!json.message?.content) return;
    
    const contentArray = Array.isArray(json.message.content) ? json.message.content : [json.message.content];
    
    for (const contentItem of contentArray) {
      if (contentItem.type === 'text') {
        // 處理文字訊息
        const message: ClaudeStreamMessage = {
          sessionId,
          type: 'assistant',
          content: contentItem.text || '',
          timestamp: new Date(),
          metadata: {
            isComplete: true,
            raw: json
          }
        };
        
        // 檢查重複後再發送
        if (this.shouldEmitMessage(message)) {
          this.emit('message', message);
        }
        this.emit('messageComplete', message);
        
      } else if (contentItem.type === 'tool_use') {
        // 處理工具使用
        const toolMessage: ClaudeStreamMessage = {
          sessionId,
          type: 'tool_use',
          content: `使用工具: ${contentItem.name}`,
          timestamp: new Date(),
          metadata: {
            toolName: contentItem.name,
            toolInput: contentItem.input,
            toolStatus: 'start',
            toolId: contentItem.id,
            raw: json
          }
        };
        
        // 檢查重複後再發送
        if (this.shouldEmitMessage(toolMessage)) {
          this.emit('message', toolMessage);
        }
        
        // 解析檔案操作
        const fileOperation = this.detectFileOperation(contentItem.name, contentItem.input);
        if (fileOperation.fileOperation) {
          toolMessage.metadata = { ...toolMessage.metadata, ...fileOperation };
        }
        
        logger.info(`Tool use detected: ${contentItem.name}`, { 
          sessionId, 
          toolName: contentItem.name, 
          toolId: contentItem.id 
        });
      }
    }
  }

  /**
   * 處理用戶訊息（包含工具結果）
   */
  private handleUserMessage(sessionId: string, json: any): void {
    if (!json.message?.content) return;
    
    const contentArray = Array.isArray(json.message.content) ? json.message.content : [json.message.content];
    
    for (const contentItem of contentArray) {
      if (contentItem.type === 'tool_result') {
        // 處理工具結果
        const toolResultMessage: ClaudeStreamMessage = {
          sessionId,
          type: 'tool_use',
          content: contentItem.is_error 
            ? `❌ 工具執行失敗: ${contentItem.content}` 
            : `✅ 工具執行完成`,
          timestamp: new Date(),
          metadata: {
            toolStatus: contentItem.is_error ? 'error' : 'complete',
            toolId: contentItem.tool_use_id,
            toolOutput: contentItem.content,
            isError: contentItem.is_error,
            raw: json
          }
        };
        
        // 檢查重複後再發送
        if (this.shouldEmitMessage(toolResultMessage)) {
          this.emit('message', toolResultMessage);
        }
        
        logger.info(`Tool result received`, { 
          sessionId, 
          toolId: contentItem.tool_use_id,
          isError: contentItem.is_error,
          content: contentItem.content?.slice(0, 100)
        });
      } else if (contentItem.type === 'text') {
        // 普通用戶訊息（應該已經在 sendMessage 中處理）
        logger.debug('Skipping user text message from stream (already sent)');
      }
    }
  }

  /**
   * 處理系統訊息
   */
  private handleSystemMessage(sessionId: string, json: any): void {
    const message: ClaudeStreamMessage = {
      sessionId,
      type: 'system',
      content: json.message || JSON.stringify(json),
      timestamp: new Date(),
      metadata: {
        raw: json
      }
    };
    
    // 檢查重複後再發送
    if (this.shouldEmitMessage(message)) {
      this.emit('message', message);
    }
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
   * 提取文字內容（處理陣列格式）
   */
  private extractTextContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (Array.isArray(content)) {
      return content
        .filter(item => item.type === 'text' && item.text)
        .map(item => item.text)
        .join('\n');
    }
    
    return '';
  }

  /**
   * 檢查是否在思考模式
   */
  private isInThinkingMode(sessionId: string): boolean {
    // 這裡可以實現更複雜的邏輯來追蹤思考狀態
    return false;
  }

  /**
   * 清理所有緩衝
   */
  private flushBuffers(sessionId: string): void {
    // 完成所有未完成的訊息
    this.messageBuffer.forEach((buffer, messageId) => {
      if (buffer.length > 0) {
        const fullContent = buffer.join('');
        this.emit('messageComplete', {
          sessionId,
          type: 'assistant',
          content: fullContent,
          timestamp: new Date(),
          metadata: {
            isComplete: true,
            sequenceId: messageId
          }
        });
      }
    });
    
    this.messageBuffer.clear();
    this.toolUsageStack.delete(sessionId);
  }

  /**
   * 檢查是否應該發送訊息（去重）
   */
  private shouldEmitMessage(message: ClaudeStreamMessage): boolean {
    const { sessionId, type, content } = message;
    
    // 空白訊息不發送
    if (!content.trim()) {
      return false;
    }
    
    // 獲取該 session 的最近訊息
    const recent = this.recentMessages.get(sessionId) || [];
    
    // 檢查是否重複
    const isDuplicate = recent.some(msg => 
      msg.type === type && 
      msg.content.trim() === content.trim() &&
      Math.abs(message.timestamp.getTime() - msg.timestamp.getTime()) < 2000 // 2秒內視為重複
    );
    
    if (isDuplicate) {
      logger.debug(`Skipping duplicate message: ${type} - ${content.slice(0, 50)}...`);
      return false;
    }
    
    // 記錄訊息並限制數量
    recent.push(message);
    if (recent.length > 10) { // 只保留最近10則
      recent.shift();
    }
    this.recentMessages.set(sessionId, recent);
    
    return true;
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
   * 清理 session 資料
   */
  cleanup(sessionId: string): void {
    this.recentMessages.delete(sessionId);
  }
}