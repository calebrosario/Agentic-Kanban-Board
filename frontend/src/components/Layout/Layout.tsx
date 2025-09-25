import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface LayoutProps {
  children: React.ReactNode;
  onCreateSession?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onCreateSession }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex h-screen relative">
      {/* 側邊欄 - 只在非手機版顯示 */}
      {!isMobile && <Sidebar onCreateSession={onCreateSession} />}

      {/* 主要內容區域 */}
      <div className="flex-1 flex flex-col overflow-hidden relative main-content-bg">
        <Header />
        <main className={`flex-1 overflow-auto ${isMobile ? 'pb-16' : ''}`}>
          {children}
        </main>
        
        {/* 底部導航 - 只在手機版顯示 */}
        {isMobile && <MobileNav onCreateSession={onCreateSession} />}
      </div>
    </div>
  );
};