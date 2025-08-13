import { AlertCircle, Bot } from "lucide-react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useWebSocket } from "../../hooks/useWebSocket";
import { sessionApi } from "../../services/api";
import { WebSocketMessage } from "../../services/websocket";
import { useMessageStore } from "../../stores/messageStore";
import { Message, Session } from "../../types/session.types";
import MessageInput from "./MessageInput";
import MessageItem from "./MessageItem";
import { MessageFilter } from "./MessageFilter";

interface ChatInterfaceProps {
  sessionId: string;
  session?: Session;
  initialMessages: Message[];
  isSessionActive: boolean;
  isProcessing?: boolean;
  onSessionUpdate?: (updates: Partial<Session>) => void;
}

// 將訊息列表提取為單獨的組件，使用 React.memo 優化
interface MessageListProps {
  messages: Message[];
}

const MessageList = React.memo<MessageListProps>(({ messages }) => {
  return (
    <div className="w-full">
      {messages.map((message) => (
        <MessageItem key={message.messageId} message={message} isStreaming={message.metadata?.isStreaming} />
      ))}
    </div>
  );
});

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, session, isSessionActive, isProcessing = false, onSessionUpdate }) => {
  // 使用 message store - 分別獲取 actions 和 state
  const messages = useMessageStore((state) => state.messages);
  const isLoading = useMessageStore((state) => state.isLoading);
  const isLoadingMore = useMessageStore((state) => state.isLoadingMore);
  const error = useMessageStore((state) => state.error);
  const initializeFromAPI = useMessageStore((state) => state.initializeFromAPI);
  const loadMoreMessages = useMessageStore((state) => state.loadMoreMessages);
  const canLoadMore = useMessageStore((state) => state.canLoadMore);
  const addMessage = useMessageStore((state) => state.addMessage);
  const updateMessageStatus = useMessageStore((state) => state.updateMessageStatus);

  // 訊息過濾狀態 - 從 localStorage 讀取或使用預設值
  const [hiddenMessageTypes, setHiddenMessageTypes] = useState<Set<Message['type']>>(() => {
    const saved = localStorage.getItem('messageFilterHiddenTypes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed as Message['type'][]);
      } catch {
        // 如果解析失敗，使用預設值
      }
    }
    // 預設隱藏 tool_use 和 thinking
    return new Set(['tool_use', 'thinking'] as Message['type'][]);
  });

  // 當過濾設置改變時，保存到 localStorage
  const handleFilterChange = useCallback((types: Set<Message['type']>) => {
    setHiddenMessageTypes(types);
    localStorage.setItem('messageFilterHiddenTypes', JSON.stringify(Array.from(types)));
  }, []);

  // 將 Map 轉換為排序後的陣列，並應用過濾
  const { sortedMessages, filteredCount } = React.useMemo(() => {
    const allMessages = Array.from(messages.values());
    const filtered = allMessages.filter((message) => !hiddenMessageTypes.has(message.type));
    const sorted = filtered.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
    return {
      sortedMessages: sorted,
      filteredCount: allMessages.length - filtered.length
    };
  }, [messages, hiddenMessageTypes]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { addEventListener, removeEventListener, subscribe, unsubscribe } = useWebSocket();

  // 1️⃣ 初始載入（頁面載入/重新整理時）
  useEffect(() => {
    if (sessionId) {
      const state = useMessageStore.getState();
      // 只有在切換到不同 session 或尚未初始化時才載入
      if (state.currentSessionId !== sessionId || !state.isInitialized) {
        // 重置舊資料並從 API 載入歷史訊息
        state.reset();
        state.initializeFromAPI(sessionId);
      }
    }

    return () => {
      // 清理時重置 store
      useMessageStore.getState().reset();
    };
  }, [sessionId]); // 只依賴 sessionId

  // 2️⃣ WebSocket 即時訊息監聽
  useEffect(() => {
    if (!sessionId) return;

    // WebSocket 事件處理函數
    const handleWebSocketMessage = (data: WebSocketMessage) => {
      if (data.sessionId !== sessionId) return;

      // 轉換 WebSocket 訊息為標準 Message 格式，保留原始類型
      const message: Message = {
        messageId: data.messageId || `ws-${Date.now()}-${Math.random()}`,
        sessionId: data.sessionId,
        type: data.type as Message["type"], // 保留原始類型，不做轉換
        content: data.content || "",
        timestamp: data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp),
        metadata: data.metadata,
      };

      addMessage(message);
    };

    // 訂閱這個 session
    subscribe(sessionId);

    // 只監聽統一的 message 事件
    // （WebSocket 服務已經修改為所有訊息都觸發 message 事件）
    addEventListener("message" as any, handleWebSocketMessage);

    // 清理函數
    return () => {
      if (sessionId) {
        unsubscribe(sessionId);
      }
      removeEventListener("message" as any, handleWebSocketMessage);
    };
  }, [sessionId, addEventListener, removeEventListener, subscribe, unsubscribe, addMessage]);

  // 3️⃣ 自動滾動處理
  const [isInitialScroll, setIsInitialScroll] = useState(true);

  // 初次載入立即滾動（在瀏覽器繪製前）
  useLayoutEffect(() => {
    if (sortedMessages.length > 0 && isInitialScroll && !isLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      setIsInitialScroll(false);
    }
  }, [sortedMessages.length, isInitialScroll, isLoading]);

  // 新訊息平滑滾動
  useEffect(() => {
    if (sortedMessages.length > 0 && !isInitialScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [sortedMessages.length, isInitialScroll]); // 只依賴訊息數量變化

  // 當 sessionId 改變時，重置初次滾動狀態
  useEffect(() => {
    setIsInitialScroll(true);
  }, [sessionId]);

  // 4️⃣ 無限滾動檢測
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 檢查是否滾動到頂部（載入更舊的訊息）
      if (container.scrollTop < 100 && canLoadMore("older") && !isLoadingMore) {
        const previousScrollHeight = container.scrollHeight;
        const previousScrollTop = container.scrollTop;

        loadMoreMessages("older").then(() => {
          // 載入完成後，保持滾動位置
          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight;
            const scrollDiff = newScrollHeight - previousScrollHeight;
            container.scrollTop = previousScrollTop + scrollDiff;
          });
        });
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [canLoadMore, loadMoreMessages, isLoadingMore]);

  // 4️⃣ 發送新訊息
  const handleSendMessage = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || !isSessionActive) {
        return;
      }

      // 樂觀更新：立即顯示用戶訊息
      const tempMessage: Message = {
        messageId: `temp-${Date.now()}`,
        sessionId,
        type: "user",
        content: messageContent,
        timestamp: new Date(),
        metadata: { status: "sending" },
      };

      addMessage(tempMessage);

      try {
        // 發送訊息到後端，WebSocket 會推送正式的訊息
        await sessionApi.sendMessage(sessionId, messageContent);

        // 立即更新 session 的 lastUserMessage 和 messageCount
        if (onSessionUpdate) {
          console.log("=== ChatInterface 調用 onSessionUpdate ===", {
            lastUserMessage: messageContent,
            messageCount: (session?.messageCount || 0) + 1,
          });
          onSessionUpdate({
            lastUserMessage: messageContent,
            messageCount: (session?.messageCount || 0) + 1,
          });
        }

        // 成功後更新狀態
        updateMessageStatus(tempMessage.messageId, "sent");
      } catch (error) {
        toast.error("發送訊息失敗");
        console.error("Error sending message:", error);
        // 標記為失敗
        updateMessageStatus(tempMessage.messageId, "failed");
        throw error; // 讓 MessageInput 組件能夠處理錯誤
      }
    },
    [sessionId, isSessionActive, onSessionUpdate, session?.messageCount, addMessage, updateMessageStatus]
  );

  // 渲染
  if (isLoading && sortedMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入對話記錄中...</p>
        </div>
      </div>
    );
  }

  if (error && sortedMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">載入訊息失敗</p>
          <button onClick={() => initializeFromAPI(sessionId)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 頂部工具列 */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          {!isSessionActive ? (
            <div className="flex items-center space-x-2 text-gray-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Session 已停止，無法發送新訊息</span>
            </div>
          ) : (
            <div className="flex-1" /> // 佔位元素
          )}
          <MessageFilter 
            hiddenTypes={hiddenMessageTypes}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

      {/* 訊息列表 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <div ref={messagesStartRef} />

        {/* 載入更多指示器 */}
        {canLoadMore("older") && (
          <div className="text-center py-4">
            {isLoadingMore ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-500">載入更多訊息...</span>
              </div>
            ) : (
              <button onClick={() => loadMoreMessages("older")} className="text-sm text-blue-600 hover:text-blue-700">
                載入更早的訊息
              </button>
            )}
          </div>
        )}

        {sortedMessages.length === 0 && !isLoading ? (
          <div className="text-center py-16">
            {filteredCount > 0 ? (
              <>
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">沒有可顯示的訊息</h3>
                <p className="text-gray-600 dark:text-gray-400">有 {filteredCount} 則訊息被過濾隱藏</p>
                <p className="text-sm text-gray-500 mt-2">點擊右上角的訊息過濾按鈕調整設定</p>
              </>
            ) : (
              <>
                <div className="bg-gradient-to-br from-green-400 to-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">開始新的對話</h3>
                <p className="text-gray-600 dark:text-gray-400">向 Claude Code 發送訊息開始互動</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* 過濾提示 */}
            {filteredCount > 0 && (
              <div className="flex justify-center mb-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 text-sm rounded-full">
                  <span>已隱藏 {filteredCount} 則訊息</span>
                </div>
              </div>
            )}
            <MessageList messages={sortedMessages} />
          </>
        )}

        {/* 處理中的 loading 動畫 */}
        {isProcessing && (
          <div className="w-full">
            <div className="mb-4 pr-4 sm:pr-4 md:pr-4 lg:pr-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm w-full border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Claude</div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 輸入框 - 使用獨立的 MessageInput 組件 */}
      <MessageInput onSendMessage={handleSendMessage} disabled={!isSessionActive} placeholder={isSessionActive ? "輸入訊息..." : "Session 已停止"} />
    </div>
  );
};
