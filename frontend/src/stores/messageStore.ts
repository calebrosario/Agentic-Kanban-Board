import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Message } from '../types/session.types';
import { sessionApi } from '../services/api';

interface MessageState {
  // 狀態
  messages: Map<string, Message>;
  currentSessionId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  lastSyncTime: Date | null;
  error: Error | null;
  
  // 分頁狀態
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMessages: number;
    hasMore: boolean;
    loadedPages: Set<number>;
  };
  
  // Actions
  initializeFromAPI: (sessionId: string) => Promise<void>;
  loadMoreMessages: (direction: 'older' | 'newer') => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: 'sending' | 'sent' | 'failed') => void;
  removeMessage: (messageId: string) => void;
  reset: () => void;
  
  // Selectors
  getSortedMessages: () => Message[];
  hasMessage: (messageId: string) => boolean;
  getMessageCount: () => number;
  canLoadMore: (direction: 'older' | 'newer') => boolean;
}

export const useMessageStore = create<MessageState>()(
  subscribeWithSelector((set, get) => ({
    // 初始狀態
    messages: new Map(),
    currentSessionId: null,
    isInitialized: false,
    isLoading: false,
    isLoadingMore: false,
    lastSyncTime: null,
    error: null,
    
    // 分頁狀態
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalMessages: 0,
      hasMore: false,
      loadedPages: new Set<number>(),
    },
    
    // 從 API 初始化（頁面載入/重新整理時）
    initializeFromAPI: async (sessionId: string) => {
      const state = get();
      
      // 如果是同一個 session 且已初始化或正在載入，不重複載入
      if (state.currentSessionId === sessionId && (state.isInitialized || state.isLoading)) {
        console.log('Skipping duplicate initialization for session:', sessionId);
        return;
      }
      
      set({ 
        isLoading: true, 
        error: null,
        currentSessionId: sessionId,
        isInitialized: false // 確保重置初始化狀態
      });
      
      try {
        // 先獲取第一頁來得知總頁數
        const firstPageResponse = await sessionApi.getMessages(sessionId, 1, 100);
        const totalPages = firstPageResponse.pagination.totalPages;
        
        // 如果有多頁，載入最後一頁；否則就用第一頁的資料
        let response;
        if (totalPages > 1) {
          response = await sessionApi.getMessages(sessionId, totalPages, 100);
        } else {
          response = firstPageResponse;
        }
        
        const messages = new Map<string, Message>();
        
        // 將訊息加入 Map，保留原始的訊息類型
        response.messages.forEach(msg => {
          messages.set(msg.messageId, {
            ...msg,
            // 確保 timestamp 是 Date 物件
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
          });
        });
        
        set({
          messages,
          isInitialized: true,
          isLoading: false,
          lastSyncTime: new Date(), // 記錄同步時間
          error: null,
          pagination: {
            currentPage: totalPages > 1 ? totalPages : 1,
            totalPages: response.pagination.totalPages,
            totalMessages: response.pagination.total,
            hasMore: totalPages > 1,
            loadedPages: new Set([totalPages > 1 ? totalPages : 1]),
          }
        });
        
        console.log(`Initialized ${messages.size} messages from page ${totalPages > 1 ? totalPages : 1} of ${totalPages} for session ${sessionId}`);
      } catch (error) {
        console.error('Failed to load messages:', error);
        set({ 
          isLoading: false,
          error: error as Error
        });
      }
    },
    
    // 添加訊息（來自 WebSocket 或用戶輸入）
    addMessage: (message: Message) => {
      const state = get();
      
      // 檢查 session 是否匹配
      if (state.currentSessionId && message.sessionId !== state.currentSessionId) {
        console.log('Ignoring message from different session:', message.sessionId);
        return;
      }
      
      // 檢查是否已存在（避免重複）
      if (state.hasMessage(message.messageId)) {
        console.log('Message already exists:', message.messageId);
        return;
      }
      
      // 檢查時間戳（避免處理舊訊息）
      const messageTime = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
      if (state.lastSyncTime && messageTime < state.lastSyncTime) {
        console.log('Skipping old message:', message.messageId, 'timestamp:', messageTime, 'lastSync:', state.lastSyncTime);
        return;
      }
      
      // 特殊處理：如果是用戶訊息，檢查是否需要替換臨時訊息
      if (message.type === 'user' && !message.messageId.startsWith('temp-')) {
        const existingMessages = Array.from(state.messages.entries());
        const tempMessage = existingMessages.find(([id, msg]) => 
          id.startsWith('temp-') && 
          msg.type === 'user' && 
          msg.content === message.content &&
          msg.metadata?.status === 'sending'
        );
        
        if (tempMessage) {
          console.log('Replacing temp message with official message:', tempMessage[0], '->', message.messageId);
          const messages = new Map(state.messages);
          // 刪除臨時訊息
          messages.delete(tempMessage[0]);
          // 添加正式訊息
          messages.set(message.messageId, {
            ...message,
            timestamp: messageTime
          });
          set({ messages });
          return;
        }
      }
      
      // 進一步檢查：避免相同時間、相同類型、相同內容的訊息
      const existingMessages = Array.from(state.messages.values());
      const isDuplicate = existingMessages.some(existing => {
        const existingTime = existing.timestamp instanceof Date ? existing.timestamp.getTime() : new Date(existing.timestamp).getTime();
        const newTime = messageTime.getTime();
        
        // 如果時間差在 100ms 內，且類型和內容相同，視為重複
        return Math.abs(existingTime - newTime) < 100 && 
               existing.type === message.type && 
               existing.content === message.content;
      });
      
      if (isDuplicate) {
        console.log('Skipping duplicate message (same time/type/content):', message.type, message.content.slice(0, 50));
        return;
      }
      
      // 添加新訊息
      const messages = new Map(state.messages);
      messages.set(message.messageId, {
        ...message,
        timestamp: messageTime
      });
      
      set({ messages });
      console.log('Added new message:', message.messageId, 'type:', message.type);
    },
    
    // 更新訊息狀態（用於發送狀態追蹤）
    updateMessageStatus: (messageId: string, status: 'sending' | 'sent' | 'failed') => {
      const state = get();
      const message = state.messages.get(messageId);
      
      if (!message) return;
      
      const messages = new Map(state.messages);
      messages.set(messageId, {
        ...message,
        metadata: {
          ...message.metadata,
          status
        }
      });
      
      set({ messages });
    },
    
    // 移除訊息（用於發送失敗時）
    removeMessage: (messageId: string) => {
      const state = get();
      const messages = new Map(state.messages);
      messages.delete(messageId);
      set({ messages });
    },
    
    // 載入更多訊息
    loadMoreMessages: async (direction: 'older' | 'newer') => {
      const state = get();
      
      if (!state.currentSessionId || state.isLoadingMore || !state.canLoadMore(direction)) {
        return;
      }
      
      set({ isLoadingMore: true, error: null });
      
      try {
        // 計算要載入的頁數
        let pageToLoad: number;
        const loadedPages = Array.from(state.pagination.loadedPages).sort((a, b) => a - b);
        
        if (direction === 'older') {
          // 載入更舊的訊息（較小的頁數）
          pageToLoad = Math.min(...loadedPages) - 1;
        } else {
          // 載入更新的訊息（較大的頁數）
          pageToLoad = Math.max(...loadedPages) + 1;
        }
        
        if (pageToLoad < 1 || pageToLoad > state.pagination.totalPages) {
          set({ isLoadingMore: false });
          return;
        }
        
        // 載入新頁面
        const response = await sessionApi.getMessages(state.currentSessionId, pageToLoad, 100);
        const messages = new Map(state.messages);
        
        // 將新訊息加入 Map
        response.messages.forEach(msg => {
          if (!messages.has(msg.messageId)) {
            messages.set(msg.messageId, {
              ...msg,
              timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
            });
          }
        });
        
        // 更新載入的頁面集合
        const newLoadedPages = new Set(state.pagination.loadedPages);
        newLoadedPages.add(pageToLoad);
        
        set({
          messages,
          isLoadingMore: false,
          pagination: {
            ...state.pagination,
            loadedPages: newLoadedPages,
            hasMore: newLoadedPages.size < state.pagination.totalPages,
          }
        });
        
        console.log(`Loaded ${response.messages.length} messages from page ${pageToLoad}`);
      } catch (error) {
        console.error('Failed to load more messages:', error);
        set({ 
          isLoadingMore: false,
          error: error as Error
        });
      }
    },
    
    // 重置狀態（切換 session 時）
    reset: () => {
      set({
        messages: new Map(),
        currentSessionId: null,
        isInitialized: false,
        isLoading: false,
        isLoadingMore: false,
        lastSyncTime: null,
        error: null,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalMessages: 0,
          hasMore: false,
          loadedPages: new Set<number>(),
        }
      });
    },
    
    // 獲取排序後的訊息陣列
    getSortedMessages: () => {
      const messages = Array.from(get().messages.values());
      return messages.sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
    },
    
    // 檢查訊息是否存在
    hasMessage: (messageId: string) => {
      return get().messages.has(messageId);
    },
    
    // 獲取訊息數量
    getMessageCount: () => {
      return get().messages.size;
    },
    
    // 檢查是否可以載入更多
    canLoadMore: (direction: 'older' | 'newer') => {
      const state = get();
      const loadedPages = Array.from(state.pagination.loadedPages);
      
      if (loadedPages.length === 0) return false;
      
      if (direction === 'older') {
        return Math.min(...loadedPages) > 1;
      } else {
        return Math.max(...loadedPages) < state.pagination.totalPages;
      }
    }
  }))
);