import { EventEmitter } from 'events';
import { ClaudeStreamMessage } from '../types/process.types';
import { MessageRepository } from '../repositories/MessageRepository';
import { logger } from '../utils/logger';

/**
 * 訊息累積器 - 智能處理訊息儲存
 * 
 * 策略：
 * 1. 即時發送片段給前端（串流效果）
 * 2. 累積完整訊息後儲存到資料庫
 * 3. 工具使用和思考過程分開處理
 * 4. 支援訊息合併和去重
 */
export class MessageAccumulator extends EventEmitter {
  private messageRepository: MessageRepository;
  private accumulator: Map<string, AccumulatedMessage> = new Map();
  private toolUsageBuffer: Map<string, ToolUsageInfo[]> = new Map();
  
  constructor() {
    super();
    this.messageRepository = new MessageRepository();
  }

  /**
   * 處理串流訊息
   */
  async handleStreamMessage(message: ClaudeStreamMessage): Promise<void> {
    const { sessionId, type, content, metadata } = message;
    
    // 注意：不在這裡 emit realtimeMessage，避免重複
    // 交由 StreamProcessor 統一處理前端發送
    
    // 根據訊息類型處理
    switch (type) {
      case 'assistant':
        await this.handleAssistantMessage(message);
        break;
        
      case 'user':
        // 用戶訊息直接儲存
        await this.saveMessage(sessionId, 'user', content);
        break;
        
      case 'tool_use':
        await this.handleToolUse(message);
        break;
        
      case 'thinking':
        await this.handleThinking(message);
        break;
        
      case 'system':
        // 系統訊息直接儲存
        await this.saveMessage(sessionId, 'system', content, metadata);
        break;
        
      case 'error':
        // 錯誤訊息保持原始類型
        await this.saveMessage(sessionId, 'error', content, metadata);
        break;
    }
  }

  /**
   * 處理助手訊息
   */
  private async handleAssistantMessage(message: ClaudeStreamMessage): Promise<void> {
    const { sessionId, content, metadata } = message;
    const sequenceId = metadata?.sequenceId || `default_${sessionId}`;
    
    if (metadata?.isPartial) {
      // 累積片段
      const accumulated = this.accumulator.get(sequenceId) || {
        sessionId,
        type: 'assistant',
        content: [],
        startTime: new Date(),
        metadata: {}
      };
      
      accumulated.content.push(content);
      this.accumulator.set(sequenceId, accumulated);
      
    } else if (metadata?.isComplete) {
      // 訊息完成，儲存到資料庫
      const accumulated = this.accumulator.get(sequenceId);
      
      if (accumulated) {
        const fullContent = accumulated.content.join('');
        await this.saveMessage(sessionId, 'assistant', fullContent, {
          ...accumulated.metadata,
          duration: Date.now() - accumulated.startTime.getTime()
        });
        
        this.accumulator.delete(sequenceId);
      } else {
        // 沒有累積的訊息，直接儲存
        await this.saveMessage(sessionId, 'assistant', content, metadata);
      }
    } else {
      // 完整訊息，直接儲存
      await this.saveMessage(sessionId, 'assistant', content, metadata);
    }
  }

  /**
   * 處理工具使用
   */
  private async handleToolUse(message: ClaudeStreamMessage): Promise<void> {
    const { sessionId, metadata } = message;
    
    if (!metadata?.toolName) return;
    
    // 累積工具使用資訊
    const toolUsage = this.toolUsageBuffer.get(sessionId) || [];
    
    const toolInfo: ToolUsageInfo = {
      name: metadata.toolName,
      status: metadata.toolStatus || 'start',
      input: metadata.toolInput,
      output: metadata.toolOutput,
      timestamp: message.timestamp,
      fileOperation: metadata.fileOperation,
      filePath: metadata.filePath
    };
    
    // 檢查是否已經有相同的工具使用記錄（避免重複）
    const existingTool = toolUsage.find(tool => 
      tool.name === toolInfo.name && 
      tool.status === toolInfo.status &&
      Math.abs(tool.timestamp.getTime() - toolInfo.timestamp.getTime()) < 1000 // 1秒內視為重複
    );
    
    if (!existingTool) {
      toolUsage.push(toolInfo);
      this.toolUsageBuffer.set(sessionId, toolUsage);
      
      // 如果工具使用完成，生成摘要並儲存
      if (metadata.toolStatus === 'complete') {
        const summary = this.generateToolUsageSummary(toolInfo);
        await this.saveMessage(sessionId, 'tool_use', summary, {
          tool: metadata.toolName,
          ...metadata
        });
      }
    } else {
      logger.debug(`Skipping duplicate tool usage: ${toolInfo.name} (${toolInfo.status})`);
    }
  }

  /**
   * 處理思考過程
   */
  private async handleThinking(message: ClaudeStreamMessage): Promise<void> {
    const { sessionId, content, metadata } = message;
    
    // 思考過程可以選擇性儲存或只在前端顯示
    // 這裡我們選擇累積後儲存摘要
    const thinkingKey = `thinking_${sessionId}`;
    const accumulated = this.accumulator.get(thinkingKey) || {
      sessionId,
      type: 'thinking',
      content: [],
      startTime: new Date(),
      metadata: { type: 'thinking' }
    };
    
    accumulated.content.push(content);
    this.accumulator.set(thinkingKey, accumulated);
    
    // 設定定時器，在思考結束後儲存
    this.scheduleThinkingSave(sessionId);
  }

  /**
   * 生成工具使用摘要
   */
  private generateToolUsageSummary(toolInfo: ToolUsageInfo): string {
    const { name, fileOperation, filePath } = toolInfo;
    
    // 根據工具類型生成易讀的摘要
    const toolSummaries: Record<string, (info: ToolUsageInfo) => string> = {
      'Read': (info) => `📖 讀取檔案: ${info.filePath}`,
      'Write': (info) => `✏️ 寫入檔案: ${info.filePath}`,
      'Edit': (info) => `📝 編輯檔案: ${info.filePath}`,
      'MultiEdit': (info) => `📝 批量編輯: ${info.filePath}`,
      'Bash': (info) => `💻 執行命令: ${this.extractCommand(info.input)}`,
      'Grep': (info) => `🔍 搜尋: ${this.extractSearchPattern(info.input)}`,
      'TodoWrite': (info) => `✅ 更新待辦事項`,
      'WebSearch': (info) => `🌐 網路搜尋: ${this.extractSearchQuery(info.input)}`,
      'Task': (info) => `🤖 委派任務給子代理`
    };
    
    const summaryGenerator = toolSummaries[name];
    if (summaryGenerator) {
      return summaryGenerator(toolInfo);
    }
    
    // 預設摘要
    if (fileOperation && filePath) {
      const operations: Record<string, string> = {
        'read': '讀取',
        'write': '寫入',
        'edit': '編輯',
        'delete': '刪除'
      };
      return `📄 ${operations[fileOperation] || fileOperation} ${filePath}`;
    }
    
    return `🔧 使用工具: ${name}`;
  }

  /**
   * 提取命令
   */
  private extractCommand(input: any): string {
    if (typeof input === 'string') return input;
    if (input?.command) return input.command;
    return '(命令)';
  }

  /**
   * 提取搜尋模式
   */
  private extractSearchPattern(input: any): string {
    if (typeof input === 'string') return input;
    if (input?.pattern) return input.pattern;
    return '(模式)';
  }

  /**
   * 提取搜尋查詢
   */
  private extractSearchQuery(input: any): string {
    if (typeof input === 'string') return input;
    if (input?.query) return input.query;
    return '(查詢)';
  }

  /**
   * 排程儲存思考內容
   */
  private scheduleThinkingSave(sessionId: string): void {
    const key = `thinking_save_${sessionId}`;
    
    // 清除現有定時器
    if (this.thinkingSaveTimers.has(key)) {
      clearTimeout(this.thinkingSaveTimers.get(key));
    }
    
    // 設定新定時器（1秒後儲存）
    const timer = setTimeout(async () => {
      const thinkingKey = `thinking_${sessionId}`;
      const accumulated = this.accumulator.get(thinkingKey);
      
      if (accumulated && accumulated.content.length > 0) {
        const fullContent = accumulated.content.join('');
        const summary = `💭 思考過程 (${fullContent.length} 字元)`;
        
        await this.saveMessage(sessionId, 'thinking', summary, {
          fullContent, // 完整內容存在 metadata 中
          duration: Date.now() - accumulated.startTime.getTime()
        });
        
        this.accumulator.delete(thinkingKey);
      }
      
      this.thinkingSaveTimers.delete(key);
    }, 1000);
    
    this.thinkingSaveTimers.set(key, timer);
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
      // 檢查是否為空白或重複內容
      if (!content.trim()) {
        logger.debug('Skipping empty message');
        return;
      }
      
      // 檢查最近是否有相同內容的訊息（避免重複儲存）
      const recentResult = await this.messageRepository.findBySessionId(sessionId, 1, 5); // 檢查最近5則
      const isDuplicate = recentResult.messages.some((msg: any) => 
        msg.type === type && 
        msg.content.trim() === content.trim() &&
        Math.abs(new Date().getTime() - msg.timestamp.getTime()) < 5000 // 5秒內視為重複
      );
      
      if (isDuplicate) {
        logger.debug(`Skipping duplicate message: ${type} - ${content.slice(0, 50)}...`);
        return;
      }
      
      const saved = await this.messageRepository.save({
        sessionId,
        type,
        content,
        metadata
      });
      
      logger.info(`Message saved: ${saved.messageId} (${type})`);
      
      // 發送儲存完成事件
      this.emit('messageSaved', {
        sessionId,
        messageId: saved.messageId,
        type,
        timestamp: saved.timestamp
      });
      
    } catch (error) {
      logger.error('Failed to save message:', error);
    }
  }

  /**
   * 獲取 session 摘要
   */
  async getSessionSummary(sessionId: string): Promise<SessionSummary> {
    const toolUsage = this.toolUsageBuffer.get(sessionId) || [];
    
    // 統計工具使用
    const toolStats = toolUsage.reduce((acc, tool) => {
      acc[tool.name] = (acc[tool.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // 統計檔案操作
    const fileOperations = toolUsage
      .filter(tool => tool.fileOperation && tool.filePath)
      .map(tool => ({
        operation: tool.fileOperation!,
        path: tool.filePath!,
        timestamp: tool.timestamp
      }));
    
    return {
      sessionId,
      toolUsageCount: toolUsage.length,
      toolStats,
      fileOperations,
      filesRead: fileOperations.filter(op => op.operation === 'read').map(op => op.path),
      filesWritten: fileOperations.filter(op => op.operation === 'write').map(op => op.path),
      filesEdited: fileOperations.filter(op => op.operation === 'edit').map(op => op.path)
    };
  }

  /**
   * 清理 session 資料
   */
  cleanup(sessionId: string): void {
    // 清理累積器
    const keysToDelete: string[] = [];
    this.accumulator.forEach((_, key) => {
      if (key.includes(sessionId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.accumulator.delete(key));
    
    // 清理工具使用緩衝
    this.toolUsageBuffer.delete(sessionId);
    
    // 清理定時器
    const timerKey = `thinking_save_${sessionId}`;
    if (this.thinkingSaveTimers.has(timerKey)) {
      clearTimeout(this.thinkingSaveTimers.get(timerKey));
      this.thinkingSaveTimers.delete(timerKey);
    }
  }

  private thinkingSaveTimers: Map<string, NodeJS.Timeout> = new Map();
}

// 類型定義
interface AccumulatedMessage {
  sessionId: string;
  type: string;
  content: string[];
  startTime: Date;
  metadata: any;
}

interface ToolUsageInfo {
  name: string;
  status: string;
  input?: any;
  output?: any;
  timestamp: Date;
  fileOperation?: string;
  filePath?: string;
}

interface SessionSummary {
  sessionId: string;
  toolUsageCount: number;
  toolStats: Record<string, number>;
  fileOperations: Array<{
    operation: string;
    path: string;
    timestamp: Date;
  }>;
  filesRead: string[];
  filesWritten: string[];
  filesEdited: string[];
}