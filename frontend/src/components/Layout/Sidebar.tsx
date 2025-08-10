import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Plus,
  Settings,
  LogOut,
  Workflow,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useSessions } from '../../hooks/useSessions';
import { cn } from '../../utils';
import { SettingsModal } from '../Settings/SettingsModal';
import { useAuth } from '../../contexts/AuthContext';
import { Tooltip } from '../Common/Tooltip';

interface SidebarProps {
  onCreateSession?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCreateSession }) => {
  const location = useLocation();
  const { sessionsByStatus, loading } = useSessions();
  const { logout } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // 從 localStorage 讀取側邊欄狀態
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // 切換側邊欄狀態並保存到 localStorage
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const totalSessions = sessionsByStatus.idle.length + 
    sessionsByStatus.completed.length + 
    sessionsByStatus.error.length + 
    sessionsByStatus.interrupted.length + 
    sessionsByStatus.processing.length;

  return (
    <div className={cn(
      "bg-white shadow-lg border-r border-gray-200 flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn(
        "border-b border-gray-200 relative",
        isCollapsed ? "p-3" : "p-6"
      )}>
        <div className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "space-x-3"
        )}>
          <img 
            src="/asset/logo.png" 
            alt="Claude Logo" 
            className="w-8 h-8"
          />
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Claude Code</h2>
              <p className="text-xs text-gray-500">Session Manager</p>
            </div>
          )}
        </div>
        
        {/* 收合/展開按鈕 */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white shadow-md rounded-full p-1 hover:bg-gray-50 transition-colors z-20"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 space-y-2",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {isCollapsed ? (
          <Tooltip content="所有 Sessions" side="right">
            <Link
              to="/"
              className={cn(
                'flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors relative',
                location.pathname === '/'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Home className="w-5 h-5 text-current" />
              {totalSessions > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">
                  {totalSessions}
                </span>
              )}
            </Link>
          </Tooltip>
        ) : (
          <Link
            to="/"
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.pathname === '/'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <div className="flex items-center space-x-3">
              <Home className="w-5 h-5 text-current" />
              <span>所有 Sessions</span>
            </div>
            {totalSessions > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full',
                location.pathname === '/'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              )}>
                {totalSessions}
              </span>
            )}
          </Link>
        )}

        {isCollapsed ? (
          <Tooltip content="Work Items" side="right">
            <Link
              to="/work-items"
              className={cn(
                'flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/work-items'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Briefcase className="w-5 h-5 text-current" />
            </Link>
          </Tooltip>
        ) : (
          <Link
            to="/work-items"
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.pathname === '/work-items'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <div className="flex items-center space-x-3">
              <Briefcase className="w-5 h-5 text-current" />
              <span>Work Items</span>
            </div>
          </Link>
        )}

        {isCollapsed ? (
          <Tooltip content="工作流程階段" side="right">
            <Link
              to="/workflow-stages"
              className={cn(
                'flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/workflow-stages'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <Workflow className="w-5 h-5 text-current" />
            </Link>
          </Tooltip>
        ) : (
          <Link
            to="/workflow-stages"
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.pathname === '/workflow-stages'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <div className="flex items-center space-x-3">
              <Workflow className="w-5 h-5 text-current" />
              <span>工作流程階段</span>
            </div>
          </Link>
        )}

        {isCollapsed ? (
          <Tooltip content="Agent 提示詞" side="right">
            <Link
              to="/agent-prompts"
              className={cn(
                'flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname.startsWith('/agent-prompts')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <FileText className="w-5 h-5 text-current" />
            </Link>
          </Tooltip>
        ) : (
          <Link
            to="/agent-prompts"
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.pathname.startsWith('/agent-prompts')
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-current" />
              <span>Agent 提示詞</span>
            </div>
          </Link>
        )}
      </nav>

      {/* 底部操作區 */}
      <div className={cn(
        "border-t border-gray-200 space-y-2",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {isCollapsed ? (
          <>
            <Tooltip content="建立 Session" side="right">
              <button 
                onClick={onCreateSession}
                className="w-full flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="設定" side="right">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="登出" side="right">
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center p-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <button 
              onClick={onCreateSession}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              建立 Session
            </button>
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              設定
            </button>
            
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </button>
          </>
        )}
        
        {loading && !isCollapsed && (
          <div className="mt-3 flex items-center justify-center text-xs text-gray-500">
            <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
            載入中...
          </div>
        )}
      </div>

      {/* 設定模態窗口 */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};