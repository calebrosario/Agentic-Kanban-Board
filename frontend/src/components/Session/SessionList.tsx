import { Plus } from "lucide-react";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDeviceType } from "../../hooks/useMediaQuery";
import { useSessions } from "../../hooks/useSessions";
import { Session, SessionStatus } from "../../types/session.types";
import { EmptyState } from "../Common/EmptyState";
import { LoadingSpinner } from "../Common/LoadingSpinner";
import { SessionCard } from "./SessionCard";
import { SearchBar } from "../Common/SearchBar";

interface SessionListProps {
  onCreateSession: () => void;
}

interface KanbanColumnProps {
  title: string;
  color: "yellow" | "green" | "blue" | "red";
  sessions: Session[];
  searchTerm: string;
  onComplete: (sessionId: string) => void;
  onInterrupt: (sessionId: string) => void;
  onResume: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onReorder?: (reorderedSessions: Session[]) => void;
  disableDrag?: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, color, sessions, searchTerm, onComplete, onInterrupt, onResume, onDelete, onReorder, disableDrag = false }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // 過濾 sessions
  const filteredSessions = useMemo(() => {
    if (!searchTerm) return sessions;

    const term = searchTerm.toLowerCase();
    return sessions.filter((session) => session.name.toLowerCase().includes(term) || session.task.toLowerCase().includes(term) || session.workingDir.toLowerCase().includes(term));
  }, [sessions, searchTerm]);

  const getColorClasses = () => {
    switch (color) {
      case "yellow":
        return {
          header: "bg-yellow-50 border-yellow-200",
          title: "text-yellow-800",
          count: "bg-yellow-100 text-yellow-800",
        };
      case "green":
        return {
          header: "bg-green-50 border-green-200",
          title: "text-green-800",
          count: "bg-green-100 text-green-800",
        };
      case "blue":
        return {
          header: "bg-blue-50 border-blue-200",
          title: "text-blue-800",
          count: "bg-blue-100 text-blue-800",
        };
      case "red":
        return {
          header: "bg-red-50 border-red-200",
          title: "text-red-800",
          count: "bg-red-100 text-red-800",
        };
    }
  };

  const colorClasses = getColorClasses();

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    // 獲取被拖曳的 session
    const draggedSession = filteredSessions[draggedIndex];
    const dropSession = filteredSessions[dropIndex];

    // 找到在原始 sessions 陣列中的索引
    const originalDraggedIndex = sessions.findIndex((s) => s.sessionId === draggedSession.sessionId);
    const originalDropIndex = sessions.findIndex((s) => s.sessionId === dropSession.sessionId);

    if (originalDraggedIndex === -1 || originalDropIndex === -1) {
      return;
    }

    // 重新排序原始 sessions
    const newSessions = [...sessions];
    newSessions.splice(originalDraggedIndex, 1);
    newSessions.splice(originalDropIndex, 0, draggedSession);

    // 調用 onReorder 來更新狀態
    onReorder?.(newSessions);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const deviceType = useDeviceType();

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col ${deviceType === "mobile" ? "h-[calc(100vh-280px)]" : "h-[600px]"} ${deviceType === "desktop" ? "min-w-[280px]" : ""}`}>
      {/* 欄位標題 */}
      <div className={`px-4 py-3 border-b rounded-t-lg flex-shrink-0 ${colorClasses.header}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${colorClasses.title}`}>{title}</h3>
          <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${colorClasses.count}`}>{filteredSessions.length}</span>
        </div>
      </div>

      {/* Sessions 列表 */}
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">沒有 Sessions</p>
          </div>
        ) : (
          filteredSessions.map((session, index) => (
            <div key={session.sessionId} className={`transform hover:scale-102 transition-transform ${!disableDrag && dragOverIndex === index ? "border-t-2 border-blue-500" : ""}`} onDragOver={!disableDrag ? (e) => handleDragOver(e, index) : undefined} onDrop={!disableDrag ? (e) => handleDrop(e, index) : undefined}>
              <SessionCard session={session} index={index} onComplete={() => onComplete(session.sessionId)} onInterrupt={() => onInterrupt(session.sessionId)} onResume={() => onResume(session.sessionId)} onDelete={() => onDelete(session.sessionId)} onDragStart={!disableDrag ? handleDragStart : undefined} onDragEnd={!disableDrag ? handleDragEnd : undefined} isDragging={!disableDrag && draggedIndex === index} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const SessionList: React.FC<SessionListProps> = ({ onCreateSession }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"processing" | "idle" | "completed">("idle");
  const deviceType = useDeviceType();

  const { sessions, sessionsByStatus, loading, error, completeSession, interruptSession, resumeSession, deleteSession, reorderSessionsByStatus } = useSessions();

  const handleComplete = async (sessionId: string) => {
    try {
      await completeSession(sessionId);
      toast.success("Session 已標記為完成");
    } catch (error) {
      toast.error("無法完成 Session");
    }
  };

  const handleInterrupt = async (sessionId: string) => {
    try {
      await interruptSession(sessionId);
      toast.success("Session 已中斷");
    } catch (error) {
      toast.error("無法中斷 Session");
    }
  };

  const handleResume = async (sessionId: string) => {
    try {
      await resumeSession(sessionId);
      toast.success("Session 已恢復");
    } catch (error) {
      toast.error("無法恢復 Session");
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("確定要刪除這個 Session 嗎？此操作無法復原。")) {
      return;
    }

    try {
      await deleteSession(sessionId);
      toast.success("Session 已刪除");
    } catch (error) {
      toast.error("無法刪除 Session");
    }
  };
  
  // 不再需要 handleContinue，因為用戶可以直接在聊天介面中繼續對話

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col min-w-0`}>
      {/* 固定的頂部區域 - 包含標題、搜尋和建立按鈕 */}
      <div className={`bg-white border-b border-gray-200 ${deviceType === "mobile" ? "px-4" : "px-6"} py-4 flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Sessions</h1>

          {/* 搜尋框和建立按鈕 */}
          <div className="flex items-center gap-3">
            {/* 搜尋框 */}
            <SearchBar
              placeholder="搜尋 Sessions..."
              onSearch={setSearchTerm}
              defaultValue={searchTerm}
              className="w-32 sm:w-48"
            />

            {/* 建立按鈕 */}
            <button onClick={onCreateSession} className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              <span>建立</span>
            </button>
          </div>
        </div>
      </div>

      {/* 內容區域 */}
      <div className="flex-1 overflow-auto">
        <div className={`h-full ${deviceType === "mobile" ? "p-4" : "p-6"}`}>
          {/* Kanban 看板 */}
          {sessions.length === 0 ? (
            <EmptyState title="沒有找到 Sessions" description="還沒有建立任何 Sessions" actionText="建立第一個 Session" onAction={onCreateSession} />
          ) : (
            <>
              {/* 行動版標籤頁 */}
              {deviceType === "mobile" && (
                <div className="flex border-b border-gray-200 mb-4 -mx-4 px-4 overflow-x-auto">
                  <button onClick={() => setActiveTab("processing")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "processing" ? "border-yellow-500 text-yellow-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    正在處理 ({sessionsByStatus[SessionStatus.PROCESSING]?.length || 0})
                  </button>
                  <button onClick={() => setActiveTab("idle")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "idle" ? "border-green-500 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    閒置 ({sessionsByStatus[SessionStatus.IDLE]?.length || 0})
                  </button>
                  <button onClick={() => setActiveTab("completed")} className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "completed" ? "border-blue-500 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    已完成 ({[...(sessionsByStatus[SessionStatus.COMPLETED] || []), ...(sessionsByStatus[SessionStatus.ERROR] || []), ...(sessionsByStatus[SessionStatus.INTERRUPTED] || [])].length})
                  </button>
                </div>
              )}

              <div className={deviceType === "mobile" ? "space-y-4 w-full" : "grid grid-cols-3 gap-4 md:gap-6 min-w-[900px]"}>
                {/* 行動版：根據選中的標籤顯示單一欄位 */}
                {deviceType === "mobile" ? (
                  <>
                    {activeTab === "processing" && <KanbanColumn title="正在處理" color="yellow" sessions={sessionsByStatus[SessionStatus.PROCESSING] || []} searchTerm={searchTerm} onComplete={handleComplete} onInterrupt={handleInterrupt} onResume={handleResume} onDelete={handleDelete} disableDrag={true} />}

                    {activeTab === "idle" && <KanbanColumn title="閒置" color="green" sessions={sessionsByStatus[SessionStatus.IDLE] || []} searchTerm={searchTerm} onComplete={handleComplete} onInterrupt={handleInterrupt} onResume={handleResume} onDelete={handleDelete} onReorder={(reorderedSessions) => reorderSessionsByStatus(SessionStatus.IDLE, reorderedSessions)} />}

                    {activeTab === "completed" && (
                      <KanbanColumn
                        title="已完成"
                        color="blue"
                        sessions={[...(sessionsByStatus[SessionStatus.COMPLETED] || []), ...(sessionsByStatus[SessionStatus.ERROR] || []), ...(sessionsByStatus[SessionStatus.INTERRUPTED] || [])]}
                        searchTerm={searchTerm}
                        onComplete={handleComplete}
                        onInterrupt={handleInterrupt}
                        onResume={handleResume}
                        onDelete={handleDelete}
                        onReorder={(reorderedSessions) => {
                          const completedSessions = reorderedSessions.filter((s) => s.status === SessionStatus.COMPLETED);
                          const errorSessions = reorderedSessions.filter((s) => s.status === SessionStatus.ERROR);
                          const interruptedSessions = reorderedSessions.filter((s) => s.status === SessionStatus.INTERRUPTED);

                          if (completedSessions.length > 0) {
                            reorderSessionsByStatus(SessionStatus.COMPLETED, completedSessions);
                          }
                          if (errorSessions.length > 0) {
                            reorderSessionsByStatus(SessionStatus.ERROR, errorSessions);
                          }
                          if (interruptedSessions.length > 0) {
                            reorderSessionsByStatus(SessionStatus.INTERRUPTED, interruptedSessions);
                          }
                        }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {/* 桌面版和平板版：顯示所有欄位 */}
                    <KanbanColumn title="正在處理" color="yellow" sessions={sessionsByStatus[SessionStatus.PROCESSING] || []} searchTerm={searchTerm} onComplete={handleComplete} onInterrupt={handleInterrupt} onResume={handleResume} onDelete={handleDelete} disableDrag={true} />

                    <KanbanColumn title="閒置" color="green" sessions={sessionsByStatus[SessionStatus.IDLE] || []} searchTerm={searchTerm} onComplete={handleComplete} onInterrupt={handleInterrupt} onResume={handleResume} onDelete={handleDelete} onReorder={(reorderedSessions) => reorderSessionsByStatus(SessionStatus.IDLE, reorderedSessions)} />

                    <KanbanColumn
                      title="已完成"
                      color="blue"
                      sessions={[...(sessionsByStatus[SessionStatus.COMPLETED] || []), ...(sessionsByStatus[SessionStatus.ERROR] || []), ...(sessionsByStatus[SessionStatus.INTERRUPTED] || [])]}
                      searchTerm={searchTerm}
                      onComplete={handleComplete}
                      onInterrupt={handleInterrupt}
                      onResume={handleResume}
                      onDelete={handleDelete}
                      onReorder={(reorderedSessions) => {
                        const completedSessions = reorderedSessions.filter((s) => s.status === SessionStatus.COMPLETED);
                        const errorSessions = reorderedSessions.filter((s) => s.status === SessionStatus.ERROR);
                        const interruptedSessions = reorderedSessions.filter((s) => s.status === SessionStatus.INTERRUPTED);

                        if (completedSessions.length > 0) {
                          reorderSessionsByStatus(SessionStatus.COMPLETED, completedSessions);
                        }
                        if (errorSessions.length > 0) {
                          reorderSessionsByStatus(SessionStatus.ERROR, errorSessions);
                        }
                        if (interruptedSessions.length > 0) {
                          reorderSessionsByStatus(SessionStatus.INTERRUPTED, interruptedSessions);
                        }
                      }}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
