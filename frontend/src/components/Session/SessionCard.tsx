import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Square, 
  RotateCcw, 
  Trash2, 
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  Workflow,
  Briefcase
} from 'lucide-react';
import { Session, SessionStatus } from '../../types/session.types';
import { formatRelativeTime, truncateText, cn } from '../../utils';
import { Tooltip } from '../Common/Tooltip';
import { useDeviceType } from '../../hooks/useMediaQuery';

interface SessionCardProps {
  session: Session;
  onComplete: () => void;
  onInterrupt: () => void;
  onResume: () => void;
  onDelete: () => void;
  index: number;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onComplete,
  onInterrupt,
  onResume,
  onDelete,
  index,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  const deviceType = useDeviceType();
  const getActionButtons = () => {
    const buttons = [];

    switch (session.status) {
      case SessionStatus.IDLE:
        // 閒置狀態只顯示完成按鈕
        buttons.push(
          <Tooltip key="complete" content="標記為完成">
            <button
              onClick={onComplete}
              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        );
        break;

      case SessionStatus.INTERRUPTED:
        buttons.push(
          <Tooltip key="resume" content="恢復 Session">
            <button
              onClick={onResume}
              className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        );
        buttons.push(
          <Tooltip key="complete" content="標記為完成">
            <button
              onClick={onComplete}
              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        );
        break;

      case SessionStatus.COMPLETED:
      case SessionStatus.ERROR:
        // 已完成和錯誤的 Session 可以直接在聊天介面中繼續對話
        // 不再需要延續按鈕
        break;

      case SessionStatus.PROCESSING:
        // 正在處理中的 Session 可以中斷
        buttons.push(
          <Tooltip key="interrupt" content="中斷執行">
            <button
              onClick={onInterrupt}
              className="p-1 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-all"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        );
        break;
    }

    // 所有狀態都可以刪除
    buttons.push(
      <Tooltip key="delete" content="刪除 Session">
        <button
          onClick={onDelete}
          className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
    );

    return buttons;
  };

  return (
    <div 
      className={cn(
        "relative group bg-white rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-all hover:border-gray-300",
        deviceType === "desktop" ? 'min-w-[220px]' : '',
        onDragStart ? 'cursor-move' : '',
        isDragging ? 'opacity-50' : ''
      )}
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => {
        onDragStart(index);
        e.dataTransfer.effectAllowed = 'move';
      } : undefined}
      onDragEnd={onDragEnd ? () => onDragEnd() : undefined}>
      {/* 卡片內容 */}
      <div className="p-2.5">
        {/* 標題行 - 包含標題和狀態 */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <Link
            to={`/sessions/${session.sessionId}`}
            className="flex-1 min-w-0 group"
          >
            <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {session.name}
            </h3>
          </Link>
          
          {/* 狀態指示器 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {session.status === SessionStatus.ERROR && (
              <Tooltip content="發生錯誤">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              </Tooltip>
            )}
            {session.status === SessionStatus.PROCESSING && (
              <Tooltip content="正在處理中">
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse"></div>
              </Tooltip>
            )}
            {/* Work Item 標籤 */}
            {session.work_item_id && (
              <Tooltip content={`關聯到 Work Item`}>
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded font-medium"
                  style={{ 
                    backgroundColor: '#9333EA20',
                    color: '#9333EA',
                    border: '1px solid #9333EA40'
                  }}
                >
                  <Briefcase className="w-2.5 h-2.5" />
                  WI
                </span>
              </Tooltip>
            )}
            {/* 工作流程階段標籤 */}
            {session.workflow_stage && (
              <Tooltip content={`工作流程階段: ${session.workflow_stage.name}`}>
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded font-medium"
                  style={{ 
                    backgroundColor: session.workflow_stage.color ? `${session.workflow_stage.color}20` : '#8B5CF620',
                    color: session.workflow_stage.color || '#8B5CF6',
                    border: `1px solid ${session.workflow_stage.color || '#8B5CF6'}40`
                  }}
                >
                  <Workflow className="w-2.5 h-2.5" />
                  {session.workflow_stage.name}
                </span>
              </Tooltip>
            )}
            {session.processId && (
              <Tooltip content={`Process ID: ${session.processId}`}>
                <span className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">
                  PID
                </span>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 描述內容 */}
        <div className="text-xs text-gray-600 mb-1.5">
          {session.messageCount && session.messageCount > 0 && session.lastUserMessage ? (
            <p className="line-clamp-2">
              {session.lastUserMessage}
            </p>
          ) : (
            <p className="line-clamp-2">
              {session.task}
            </p>
          )}
        </div>

        {/* 分類標籤 */}
        {(session.projects && session.projects.length > 0 || session.tags && session.tags.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {/* 專案標籤 */}
            {session.projects?.map(project => (
              <span
                key={project.project_id}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-md"
                style={{ 
                  backgroundColor: project.color ? `${project.color}20` : '#E5E7EB',
                  color: project.color || '#374151'
                }}
              >
                {project.icon && <span className="text-[9px]">{project.icon}</span>}
                {project.name}
              </span>
            ))}
            {/* 標籤 */}
            {session.tags?.map(tag => (
              <span
                key={tag.tag_id}
                className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-md"
                style={{ 
                  backgroundColor: tag.color ? `${tag.color}20` : '#E5E7EB',
                  color: tag.color || '#374151'
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 元資訊行 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-gray-500 gap-1 sm:gap-0">
          <div className="flex items-center gap-3">
            {/* 訊息數 */}
            {session.messageCount !== undefined && (
              <Tooltip content={`${session.messageCount} 則訊息`} side="left">
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{session.messageCount}</span>
                </div>
              </Tooltip>
            )}
            
          </div>
          
          {/* 更新時間 */}
          <span>{formatRelativeTime(session.updatedAt)}</span>
        </div>

        {/* 錯誤訊息 */}
        {session.error && (
          <div className="mt-1.5 p-1.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-700">
            {(() => {
              try {
                const errorObj = JSON.parse(session.error);
                return errorObj.message || truncateText(session.error, 60);
              } catch {
                return truncateText(session.error, 60);
              }
            })()}
          </div>
        )}
      </div>

      {/* 操作按鈕 - hover 時顯示，絕對定位 */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-white/95 backdrop-blur-sm border-t border-gray-100 rounded-b-md opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div className="flex items-center justify-end gap-0.5">
          {getActionButtons()}
        </div>
      </div>
    </div>
  );
};