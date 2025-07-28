import React from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';

export const Header: React.FC = () => {
  const isMobile = useIsMobile();

  // 手機版才顯示 Header
  if (!isMobile) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          <img 
            src="/asset/logo.png" 
            alt="Claude Logo" 
            className="w-6 h-6"
          />
          <h1 className="text-lg font-semibold text-gray-900">Claude Code</h1>
        </div>
      </div>
    </header>
  );
};