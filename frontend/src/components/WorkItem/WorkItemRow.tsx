import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { getDateLocale } from '../../i18n/dateLocale';
import {
  Briefcase,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  MoreVertical,
  Calendar,
  FolderOpen
} from 'lucide-react';
import { WorkItem } from '../../types/workitem';
import { useI18nContext } from '../../contexts/I18nContext';

interface WorkItemRowProps {
  workItem: WorkItem;
  onEdit?: (workItem: WorkItem) => void;
  onDelete?: (workItemId: string) => void;
  onStatusChange?: (workItemId: string, status: WorkItem['status']) => void;
}

export const WorkItemRow: React.FC<WorkItemRowProps> = ({
  workItem,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  const { t, language } = useI18nContext();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleRowClick = (e: React.MouseEvent) => {
    // 不要在點擊選單區域時導航
    if ((e.target as HTMLElement).closest('.menu-area')) {
      return;
    }
    navigate(`/work-items/${workItem.work_item_id}`);
  };

  // 計算選單位置
  const getMenuPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 192; // w-48 = 12rem = 192px
    const viewportWidth = window.innerWidth;

    let left = rect.right - menuWidth;
    let top = rect.bottom + 8;

    // 確保不超出視窗邊界
    if (left < 8) left = 8;
    if (left + menuWidth > viewportWidth - 8) left = viewportWidth - menuWidth - 8;

    return { top, left };
  };

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const statusConfig = {
    planning: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: t('workitem.status.planning'), emoji: '📋' },
    in_progress: { icon: Play, color: 'text-blue-600', bg: 'bg-blue-100', label: t('workitem.status.in_progress'), emoji: '🚀' },
    completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: t('workitem.status.completed'), emoji: '✅' },
    cancelled: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: t('workitem.status.cancelled'), emoji: '❌' }
  };

  const status = statusConfig[workItem.status];

  // 僅保留狀態相關的變數

  return (
    <div
      className="glass-card hover:shadow-soft-md transition-all duration-200 cursor-pointer border-l-4 border-l-gray-300"
      onClick={handleRowClick}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          {/* WorkItem 基本信息 */}
          <div className="flex items-center gap-3 min-w-0" style={{ width: '250px' }}>
            <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {workItem.title}
              </h3>
              {workItem.workspace_path && (
                <div className="flex items-center gap-1 mt-0.5">
                  <FolderOpen className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500 truncate">
                    {workItem.workspace_path.split(/[\\/]/).pop()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 描述 */}
          <div className="flex-1 min-w-0">
            {workItem.description ? (
              <p className="text-sm text-gray-700 truncate">
                {workItem.description}
              </p>
            ) : (
              <span className="text-sm text-gray-400 italic">{t('workitem.detail.info.noDescription')}</span>
            )}
          </div>


          {/* 狀態 */}
          <div className="flex items-center" style={{ width: '120px' }}>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
              <span>{status.emoji}</span>
              {status.label}
            </span>
          </div>

          {/* 時間信息 */}
          <div className="flex items-center gap-1 text-xs text-gray-500" style={{ width: '150px' }}>
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {workItem.completed_at
                ? t('workitem.card.timeline.completed', { time: formatDistanceToNow(new Date(workItem.completed_at), { locale: getDateLocale(language), addSuffix: true }) })
                : t('workitem.card.timeline.created', { time: formatDistanceToNow(new Date(workItem.created_at), { locale: getDateLocale(language), addSuffix: true }) })
              }
            </span>
          </div>

          {/* 操作選單 */}
          <div className="relative menu-area flex-shrink-0">
            <button
              ref={buttonRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 hover:bg-white/60 rounded transition-all hover:shadow-soft-sm"
              title={t('workitem.row.operationsMenu')}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Portal 選單 */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 z-[99999] w-48"
          style={getMenuPosition()}
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onEdit(workItem);
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
            >
              📝 {t('workitem.card.actions.edit')}
            </button>
          )}

          {workItem.status === 'planning' && onStatusChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onStatusChange(workItem.work_item_id, 'in_progress');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              🚀 {t('workitem.card.actions.startExecution')}
            </button>
          )}

          {workItem.status === 'in_progress' && onStatusChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onStatusChange(workItem.work_item_id, 'completed');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ✅ {t('workitem.card.actions.markComplete')}
            </button>
          )}

          {(workItem.status === 'planning' || workItem.status === 'in_progress') && onStatusChange && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onStatusChange(workItem.work_item_id, 'cancelled');
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ❌ {t('workitem.card.actions.cancel')}
            </button>
          )}

          {onDelete && (
            <>
              <div className="border-t border-gray-100"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(workItem.work_item_id);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
              >
                🗑️ {t('workitem.card.actions.delete')}
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};