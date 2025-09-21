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
      "glass-extreme border-r border-glass-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn(
        "border-b border-glass-border relative",
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
          className="absolute -right-3 top-1/2 -translate-y-1/2 glass-ultra rounded-full p-1.5 hover:shadow-soft-md transition-all z-30 border border-white/40"
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
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue'
                  : 'text-gray-600 hover:bg-white/50 hover:shadow-soft'
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
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue'
                : 'text-gray-600 hover:bg-white/50 hover:shadow-soft'
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
                  ? 'bg-white/90 text-blue-600 border border-white/50'
                  : 'bg-white/50 text-gray-700 border border-glass-border'
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
                  ? 'relative bg-white/30 backdrop-blur-md text-purple-700 border border-white/50 shadow-soft before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-500/20 before:to-purple-600/20 before:rounded-lg'
                  : 'text-gray-700 hover:bg-white/20 hover:backdrop-blur-md hover:shadow-soft hover:border hover:border-white/30'
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
                ? 'relative bg-white/30 backdrop-blur-md text-purple-700 border border-white/50 shadow-soft overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-purple-500/20 before:to-purple-600/20 before:-z-10'
                : 'text-gray-700 hover:bg-white/20 hover:backdrop-blur-md hover:shadow-soft hover:border hover:border-white/30'
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
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue'
                  : 'text-gray-600 hover:bg-white/50 hover:shadow-soft'
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
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue'
                : 'text-gray-600 hover:bg-white/50 hover:shadow-soft'
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
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue'
                  : 'text-gray-600 hover:bg-white/50 hover:shadow-soft'
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
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue'
                : 'text-gray-600 hover:bg-white/50 hover:shadow-soft'
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
        "border-t border-glass-border space-y-2",
        isCollapsed ? "p-2" : "p-4"
      )}>
        {isCollapsed ? (
          <>
            <Tooltip content="建立 Session" side="right">
              <button 
                onClick={onCreateSession}
                className="w-full flex items-center justify-center p-2 btn-primary"
              >
                <Plus className="w-5 h-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="設定" side="right">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center justify-center p-2 btn-secondary"
              >
                <Settings className="w-5 h-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="登出" side="right">
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center p-2 bg-danger-50 text-danger-700 rounded-xl hover:bg-danger-100 shadow-soft-sm hover:shadow-soft transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </Tooltip>
          </>
        ) : (
          <>
            <button 
              onClick={onCreateSession}
              className="w-full flex items-center justify-center btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              建立 Session
            </button>
            
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center justify-center btn-secondary"
            >
              <Settings className="w-4 h-4 mr-2" />
              設定
            </button>
            
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center px-4 py-2 bg-danger-50 text-danger-700 rounded-xl hover:bg-danger-100 shadow-soft-sm hover:shadow-soft transition-all"
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