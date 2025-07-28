import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Plus,
  Settings,
  LogOut
} from 'lucide-react';
import { useSessions } from '../../hooks/useSessions';
import { cn } from '../../utils';
import { SettingsModal } from '../Settings/SettingsModal';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  onCreateSession?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCreateSession }) => {
  const location = useLocation();
  const { sessionsByStatus, loading } = useSessions();
  const { logout } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const totalSessions = sessionsByStatus.idle.length + 
    sessionsByStatus.completed.length + 
    sessionsByStatus.error.length + 
    sessionsByStatus.interrupted.length + 
    sessionsByStatus.processing.length;

  return (
    <div className="bg-white w-64 shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img 
            src="/asset/logo.png" 
            alt="Claude Logo" 
            className="w-8 h-8"
          />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Claude Code</h2>
            <p className="text-xs text-gray-500">Session Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
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
      </nav>

      {/* 底部操作區 */}
      <div className="p-4 border-t border-gray-200 space-y-2">
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
        
        {loading && (
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