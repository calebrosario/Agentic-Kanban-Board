import { v4 as uuidv4 } from 'uuid';
import { Session, SessionStatus, CreateSessionRequest } from '../types/session.types';
import { ProcessManager } from './ProcessManager';
import { SessionRepository } from '../repositories/SessionRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { logger } from '../utils/logger';
import { io } from '../server';

export class SessionService {
  private processManager: ProcessManager;
  private sessionRepository: SessionRepository;
  private messageRepository: MessageRepository;
  
  constructor(processManager?: ProcessManager) {
    // 使用傳入的 ProcessManager 實例，或者建立新的（向後相容）
    if (processManager) {
      this.processManager = processManager;
      logger.info('Using shared ProcessManager instance');
    } else {
      this.processManager = new ProcessManager(true);
      logger.info('ProcessManager initialized (npx mode)');
      // 監聽進程事件
      this.setupProcessEventListeners();
    }
    
    this.sessionRepository = new SessionRepository();
    this.messageRepository = new MessageRepository();
  }

  async initialize(): Promise<void> {
    await this.processManager.initialize();
  }

  private setupProcessEventListeners(): void {
    // 進程準備就緒
    this.processManager.on('processReady', async (data: { sessionId: string }) => {
      const session = await this.sessionRepository.findById(data.sessionId);
      if (session && session.status !== SessionStatus.IDLE) {
        session.status = SessionStatus.IDLE;
        session.updatedAt = new Date();
        await this.sessionRepository.update(session);
      }
    });

    // 進程結束
    this.processManager.on('processExit', async (data: { sessionId: string; code: number | null; signal: string | null }) => {
      const session = await this.sessionRepository.findById(data.sessionId);
      if (session) {
        // 只有在執行失敗時才更新狀態為 ERROR
        // 正常執行完成時，狀態應該保持 IDLE（已在 ProcessManager 中處理）
        if (data.code !== 0) {
          session.status = SessionStatus.ERROR;
          session.error = `Process exited with code ${data.code}`;
          session.updatedAt = new Date();
          await this.sessionRepository.update(session);
        }
        // 注意：不再將 code === 0 的情況設為 COMPLETED
        // COMPLETED 狀態應該只在用戶明確結束 session 時才設置
      }
    });

    // 進程錯誤
    this.processManager.on('processError', async (data: { sessionId: string; error: string }) => {
      const session = await this.sessionRepository.findById(data.sessionId);
      if (session) {
        session.status = SessionStatus.ERROR;
        session.error = data.error;
        session.updatedAt = new Date();
        await this.sessionRepository.update(session);
      }
    });
  }
  
  async createSession(request: CreateSessionRequest): Promise<Session> {
    // 驗證請求
    this.validateCreateRequest(request);
    
    // 如果有 workflow_stage_id，增強任務內容
    let enhancedTask = request.task;
    if (request.workflow_stage_id) {
      const { WorkflowStageService } = await import('./WorkflowStageService');
      const workflowStageService = new WorkflowStageService();
      try {
        const stage = await workflowStageService.getStage(request.workflow_stage_id);
        if (stage) {
          // 將 system_prompt 和原始任務結合
          enhancedTask = `${stage.system_prompt}\n\n用戶任務：${request.task}`;
          
          // 如果有建議任務，可以在任務中提示
          if (stage.suggested_tasks && stage.suggested_tasks.length > 0) {
            enhancedTask += `\n\n建議的工作項目：\n${stage.suggested_tasks.map(t => `- ${t}`).join('\n')}`;
          }
        }
      } catch (error) {
        logger.warn(`Failed to get workflow stage ${request.workflow_stage_id}:`, error);
        // 如果獲取失敗，繼續使用原始任務
      }
    }
    
    // 建立 Session
    const session: Session = {
      sessionId: uuidv4(),
      name: request.name,
      workingDir: request.workingDir,
      task: enhancedTask,
      status: SessionStatus.PROCESSING,
      continueChat: request.continueChat || false,
      previousSessionId: request.previousSessionId,
      dangerouslySkipPermissions: request.dangerouslySkipPermissions || false,
      workflow_stage_id: request.workflow_stage_id,
      lastUserMessage: undefined, // 初始時沒有用戶對話訊息
      messageCount: 0, // 初始對話計數為 0
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 儲存 Session
    await this.sessionRepository.save(session);
    
    try {
      // 啟動 Claude Code 進程
      const processId = await this.processManager.startClaudeProcess(session);
      
      // 更新 Session 狀態 - 如果有初始任務，保持 PROCESSING 狀態
      session.processId = processId;
      // 只有在沒有初始任務時才設為 IDLE
      if (!session.task) {
        session.status = SessionStatus.IDLE;
      }
      session.updatedAt = new Date();
      
      await this.sessionRepository.update(session);
      
      // 獲取該 session 的專案和標籤資訊（新創建的通常為空，但保持 API 一致性）
      const [projects, tags] = await Promise.all([
        this.sessionRepository.getSessionProjects(session.sessionId),
        this.sessionRepository.getSessionTags(session.sessionId)
      ]);
      
      session.projects = projects;
      session.tags = tags;
      
      return session;
    } catch (error) {
      // 如果啟動失敗，更新狀態
      session.status = SessionStatus.ERROR;
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.updatedAt = new Date();
      
      await this.sessionRepository.update(session);
      
      throw error;
    }
  }
  
  async listSessions(): Promise<Session[]> {
    const sessions = await this.sessionRepository.findAll();
    
    // 如果沒有 sessions，直接返回
    if (sessions.length === 0) {
      return sessions;
    }
    
    // 獲取所有 session IDs
    const sessionIds = sessions.map(s => s.sessionId);
    
    // 批量獲取專案和標籤資訊
    const [projectsMap, tagsMap] = await Promise.all([
      this.sessionRepository.getSessionsProjects(sessionIds),
      this.sessionRepository.getSessionsTags(sessionIds)
    ]);
    
    // 將專案和標籤資訊附加到每個 session
    for (const session of sessions) {
      session.projects = projectsMap.get(session.sessionId) || [];
      session.tags = tagsMap.get(session.sessionId) || [];
    }
    
    return sessions;
  }
  
  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.sessionRepository.findById(sessionId);
    
    if (!session) {
      return null;
    }
    
    // 獲取該 session 的專案和標籤資訊
    const [projects, tags] = await Promise.all([
      this.sessionRepository.getSessionProjects(sessionId),
      this.sessionRepository.getSessionTags(sessionId)
    ]);
    
    session.projects = projects;
    session.tags = tags;
    
    // 獲取 workflow stage 資訊
    if (session.workflow_stage_id) {
      const { WorkflowStageService } = await import('./WorkflowStageService');
      const workflowStageService = new WorkflowStageService();
      try {
        const stage = await workflowStageService.getStage(session.workflow_stage_id);
        if (stage) {
          session.workflow_stage = {
            stage_id: stage.stage_id,
            name: stage.name,
            color: stage.color,
            icon: stage.icon,
            system_prompt: stage.system_prompt,
            temperature: stage.temperature,
            suggested_tasks: stage.suggested_tasks
          };
        }
      } catch (error) {
        logger.warn(`Failed to get workflow stage for session ${sessionId}:`, error);
      }
    }
    
    return session;
  }
  
  async completeSession(sessionId: string): Promise<Session | null> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }
    
    // 只有 IDLE 或 ERROR 狀態的 session 可以被標記為完成
    if (session.status !== SessionStatus.IDLE && session.status !== SessionStatus.ERROR) {
      throw new ValidationError('Session must be idle or in error state to complete', 'INVALID_STATUS');
    }
    
    // 停止進程（如果有的話）
    if (session.processId) {
      await this.processManager.stopProcess(sessionId);
    }
    
    // Update session
    session.status = SessionStatus.COMPLETED;
    session.completedAt = new Date();
    session.updatedAt = new Date();
    session.error = null; // 清除錯誤訊息
    
    await this.sessionRepository.update(session);
    
    // 獲取該 session 的專案和標籤資訊
    const [projects, tags] = await Promise.all([
      this.sessionRepository.getSessionProjects(sessionId),
      this.sessionRepository.getSessionTags(sessionId)
    ]);
    
    session.projects = projects;
    session.tags = tags;
    
    return session;
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    // 不能刪除正在處理中的 session
    if (session.status === SessionStatus.PROCESSING) {
      throw new ValidationError('Cannot delete a session that is currently processing', 'SESSION_STILL_PROCESSING');
    }
    
    // 如果有進程在運行，先停止它
    if (session.processId && session.status === SessionStatus.IDLE) {
      try {
        await this.processManager.stopProcess(sessionId);
      } catch (error) {
        logger.warn(`Failed to stop process before deletion:`, error);
      }
    }
    
    await this.sessionRepository.delete(sessionId);
  }
  
  async sendMessage(sessionId: string, content: string): Promise<any> {
    logger.info(`=== SessionService.sendMessage START ===`);
    logger.info(`SessionId: ${sessionId}`);
    logger.info(`Content: ${content?.slice(0, 100)}`);
    
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    logger.info(`Session found:`, { sessionId: session.sessionId, status: session.status });
    
    // 允許 IDLE、COMPLETED、ERROR 狀態的 Session 發送訊息
    // 不允許 PROCESSING 狀態（避免衝突）
    if (session.status === SessionStatus.PROCESSING) {
      throw new ValidationError('Session is currently processing another message', 'SESSION_BUSY');
    }
    
    // 如果是 INTERRUPTED 狀態，也不允許發送訊息（需要先恢復）
    if (session.status === SessionStatus.INTERRUPTED) {
      throw new ValidationError('Session is interrupted, please resume first', 'SESSION_INTERRUPTED');
    }
    
    try {
      // 如果 Session 是 COMPLETED 或 ERROR 狀態，需要重新啟動進程
      const needsRestart = session.status === SessionStatus.COMPLETED || session.status === SessionStatus.ERROR;
      
      // 發送訊息前，先更新 session 狀態為 PROCESSING 並清除舊錯誤
      session.status = SessionStatus.PROCESSING;
      session.error = null; // 清除舊錯誤訊息
      session.lastUserMessage = content; // 更新最後用戶訊息
      session.messageCount = (session.messageCount || 0) + 1; // 增加訊息計數
      session.updatedAt = new Date();
      await this.sessionRepository.update(session);
      logger.info(`Session status updated to PROCESSING, needsRestart: ${needsRestart}`);
      
      // 廣播 session 更新到前端
      const updateData = {
        sessionId: sessionId,
        lastUserMessage: session.lastUserMessage,
        messageCount: session.messageCount,
        updatedAt: session.updatedAt
      };
      logger.info('=== 發送 session_updated WebSocket 事件 ===', updateData);
      io.emit('session_updated', updateData);
      
      // 如果需要重新啟動進程，先啟動它
      if (needsRestart) {
        logger.info(`Restarting Claude Code process for session ${sessionId}...`);
        
        // 清除 task 避免重複執行原始任務
        // 保留原有的 claudeSessionId，讓進程使用 --resume 來恢復同一個對話
        const sessionForRestart = { ...session, task: '' };
        
        try {
          const processId = await this.processManager.startClaudeProcess(sessionForRestart);
          session.processId = processId;
          await this.sessionRepository.update(session);
          logger.info(`Process restarted successfully with PID: ${processId}`);
        } catch (error) {
          logger.error(`Failed to restart process for session ${sessionId}:`, error);
          throw new Error(`Failed to restart session: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // ProcessManager 會自動保存用戶訊息並發送到進程
      logger.info(`Calling ProcessManager.sendMessage...`);
      await this.processManager.sendMessage(sessionId, content);
      logger.info(`ProcessManager.sendMessage completed`);
      
      // 返回剛保存的用戶訊息
      logger.info(`Fetching recent messages...`);
      // 獲取更多最近訊息，因為可能有 assistant 訊息在用戶訊息之後
      const messages = await this.messageRepository.getRecentMessages(sessionId, 10);
      
      const userMessage = messages.find(msg => msg.type === 'user' && msg.content === content);
      logger.info(`Looking for user message with content: "${content}"`);
      logger.info(`Found user message:`, userMessage);
      
      if (!userMessage) {
        logger.warn(`User message not found! Available messages:`, messages.map(m => ({ type: m.type, content: m.content?.slice(0, 50), timestamp: m.timestamp })));
      }
      
      return userMessage;
    } catch (error) {
      logger.error(`SessionService.sendMessage error:`, error);
      // 如果進程發送失敗，更新 session 狀態
      session.status = SessionStatus.ERROR;
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.updatedAt = new Date();
      await this.sessionRepository.update(session);
      
      throw error;
    }
  }
  
  async getMessages(sessionId: string, page: number = 1, limit: number = 50): Promise<any> {
    logger.info(`=== SessionService.getMessages START ===`);
    logger.info(`SessionId: ${sessionId}, Page: ${page}, Limit: ${limit}`);
    
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    logger.info(`Session found, calling MessageRepository.findBySessionId...`);
    const result = await this.messageRepository.findBySessionId(sessionId, page, limit);
    
    return result;
  }

  async saveAssistantMessage(sessionId: string, content: string): Promise<any> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    return await this.messageRepository.save({
      sessionId,
      type: 'assistant',
      content
    });
  }

  async getRecentMessages(sessionId: string, count: number = 10): Promise<any[]> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    return await this.messageRepository.getRecentMessages(sessionId, count);
  }

  async exportSessionConversation(sessionId: string, format: 'json' | 'markdown' | 'csv' = 'json'): Promise<string> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    return await this.messageRepository.exportSessionConversation(sessionId, format);
  }
  
  async interruptSession(sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    if (session.status !== SessionStatus.PROCESSING) {
      throw new ValidationError('Session is not processing', 'INVALID_STATUS');
    }
    
    try {
      // 發送中斷信號到進程
      await this.processManager.interruptProcess(sessionId);
      
      // 中斷後保持在 IDLE 狀態，並清除錯誤訊息
      session.status = SessionStatus.IDLE;
      session.error = null; // 清除錯誤訊息
      session.updatedAt = new Date();
      
      await this.sessionRepository.update(session);
      
      // 獲取該 session 的專案和標籤資訊
      const [projects, tags] = await Promise.all([
        this.sessionRepository.getSessionProjects(sessionId),
        this.sessionRepository.getSessionTags(sessionId)
      ]);
      
      session.projects = projects;
      session.tags = tags;
      
      return session;
    } catch (error) {
      session.status = SessionStatus.ERROR;
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.updatedAt = new Date();
      await this.sessionRepository.update(session);
      
      throw error;
    }
  }
  
  async resumeSession(sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    if (session.status !== SessionStatus.INTERRUPTED) {
      throw new ValidationError('Session is not interrupted', 'INVALID_STATUS');
    }
    
    // 檢查進程是否仍在運行
    const processInfo = this.processManager.getProcessInfo(sessionId);
    if (!processInfo) {
      throw new ValidationError('Process not found for session', 'PROCESS_NOT_FOUND');
    }
    
    // 恢復會話只需要更新狀態，進程會自動處理
    session.status = SessionStatus.IDLE;
    session.updatedAt = new Date();
    
    await this.sessionRepository.update(session);
    
    // 獲取該 session 的專案和標籤資訊
    const [projects, tags] = await Promise.all([
      this.sessionRepository.getSessionProjects(sessionId),
      this.sessionRepository.getSessionTags(sessionId)
    ]);
    
    session.projects = projects;
    session.tags = tags;
    
    return session;
  }

  // 新增方法：獲取進程資訊
  async getProcessInfo(sessionId: string): Promise<any> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new ValidationError('Session not found', 'SESSION_NOT_FOUND');
    }
    
    const processInfo = this.processManager.getProcessInfo(sessionId);
    const metrics = await this.processManager.getProcessMetrics(sessionId);
    
    return {
      processInfo,
      metrics,
      isActive: !!processInfo
    };
  }

  // 新增方法：獲取所有活躍進程統計
  async getSystemStats(): Promise<any> {
    const allProcessInfo = this.processManager.getAllProcessInfo();
    const activeCount = this.processManager.getActiveProcessCount();
    
    return {
      totalProcesses: activeCount,
      processes: allProcessInfo,
      systemStatus: activeCount > 0 ? 'active' : 'idle'
    };
  }
  
  private validateCreateRequest(request: CreateSessionRequest): void {
    if (!request.name) {
      throw new ValidationError('name is required', 'VALIDATION_ERROR');
    }
    if (!request.workingDir) {
      throw new ValidationError('workingDir is required', 'VALIDATION_ERROR');
    }
    if (!request.task) {
      throw new ValidationError('task is required', 'VALIDATION_ERROR');
    }
  }

  async reorderSessions(status: SessionStatus, sessionIds: string[]): Promise<void> {
    // Update sort order for each session
    for (let i = 0; i < sessionIds.length; i++) {
      await this.sessionRepository.updateSortOrder(sessionIds[i], i);
    }
    
    logger.info(`Reordered ${sessionIds.length} sessions for status ${status}`);
  }
}

// 自訂錯誤類別
export class ValidationError extends Error {
  statusCode: number = 400;
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ValidationError';
  }
}