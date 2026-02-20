import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { SessionList } from '../Session/SessionList';
import { SessionDetail } from '../Session/SessionDetail';
import { X, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import { cn } from '../../utils';
import { Tooltip } from '../Common/Tooltip';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useSessionsContext } from '../../contexts/SessionsContext';
import { useI18nContext } from '../../contexts/I18nContext';

interface SplitViewProps {
  onCreateSession: () => void;
}

export const SplitView: React.FC<SplitViewProps> = ({ onCreateSession }) => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(50); // Percentage
  const [dragWidth, setDragWidth] = useState<number | null>(null); // Temporary width during drag
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null); // requestAnimationFrame ID
  const isMobile = useIsMobile();
  const { sessions } = useSessionsContext();
  const { t } = useI18nContext();

  // When route changes, only reset fullscreen state, keep user-adjusted width
  useEffect(() => {
    if (sessionId) {
      setIsFullScreen(false);
      // No longer reset width, keep user preferences
    }
  }, [sessionId]);

  // Monitor sessions changes, check if current session still exists
  useEffect(() => {
    if (sessionId) {
      const sessionExists = sessions.some(session => session.sessionId === sessionId);
      if (!sessionExists) {
        // If current session was deleted, close right panel
        navigate('/');
      }
    }
  }, [sessions, sessionId, navigate]);

  const handleClose = () => {
    const from = searchParams.get('from');
    const workItemId = searchParams.get('workItemId');
    
    if (from === 'work-item' && workItemId) {
      // If coming from Work Item page, return to Work Item page
      navigate(`/work-items/${workItemId}`);
    } else {
      // Otherwise return to main page
      navigate('/');
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // Set initial dragWidth when drag starts
    setDragWidth(rightPanelWidth);
  }, [rightPanelWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      // Use requestAnimationFrame to throttle updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newRightWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;

        // Limit width between 30% and 70% (ensure both sides have at least 30%)
        const clampedWidth = Math.min(70, Math.max(30, newRightWidth));
        setDragWidth(clampedWidth); // Only update temporary width
      });
    };

    const handleMouseUp = () => {
      // When drag ends, set temporary width as final width
      if (dragWidth !== null) {
        setRightPanelWidth(dragWidth);
      }
      setDragWidth(null);
      setIsDragging(false);

      // Cleanup requestAnimationFrame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Cleanup requestAnimationFrame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isDragging, dragWidth]);

  return (
    <div ref={containerRef} className="flex h-full w-full relative">
      {/* Left side SessionList - Fixed width, scrollable */}
      <div
        className={cn(
          "h-full overflow-hidden",
          sessionId && (isFullScreen || isMobile) ? "hidden" : "block",
          isDragging ? "" : "transition-all duration-300"
        )}
        style={{
          width: isMobile ? '100%' : (sessionId && !isFullScreen ? `${100 - (dragWidth ?? rightPanelWidth)}%` : '100%')
        }}
      >
        <SessionList onCreateSession={onCreateSession} />
      </div>

      {/* Right side SessionDetail - Show when sessionId exists */}
      {sessionId && !isFullScreen && (
        <>
          {/* Draggable divider - Only show in non-mobile mode */}
          {!isMobile && (
            <div
              className="w-2 hover:w-3 bg-gray-200 hover:bg-blue-400 cursor-col-resize relative flex-shrink-0 group transition-all"
              onMouseDown={handleMouseDown}
              style={{
                backgroundColor: isDragging ? '#3b82f6' : undefined,
                width: isDragging ? '3px' : undefined
              }}
            >
              <div className="absolute inset-y-0 -left-2 -right-2" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
                <div className="w-1 h-6 bg-gray-400 group-hover:bg-white rounded-full opacity-60" />
                <div className="w-1 h-6 bg-gray-400 group-hover:bg-white rounded-full opacity-60" />
                <div className="w-1 h-6 bg-gray-400 group-hover:bg-white rounded-full opacity-60" />
              </div>
            </div>
          )}

          {/* SessionDetail panel */}
          <div
            className={cn(
              "h-full bg-white shadow-lg overflow-hidden flex flex-col relative",
              isMobile ? "fixed inset-0 z-40" : "",
              isDragging ? "" : "transition-all duration-300"
            )}
            style={{ width: isMobile ? '100%' : `${dragWidth ?? rightPanelWidth}%` }}
          >
            {/* Panel control buttons - Top left */}
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
              {isMobile ? (
                <Tooltip content={searchParams.get('from') === 'work-item' ? t('common:layout.returnToWorkItem') : t('common:layout.returnToList')}>
                  <button
                    onClick={handleClose}
                    className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                  </button>
                </Tooltip>
              ) : (
                <>
                  {searchParams.get('from') === 'work-item' && (
                    <Tooltip content={t('common:layout.returnToWorkItem')}>
                      <button
                        onClick={handleClose}
                        className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      >
                        <ArrowLeft className="w-4 h-4 text-gray-600" />
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content={t('common:layout.fullscreen')}>
                    <button
                      onClick={toggleFullScreen}
                      className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                      <Maximize2 className="w-4 h-4 text-gray-600" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Close">
                    <button
                      onClick={() => navigate('/')}
                      className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </Tooltip>
                </>
              )}
            </div>

            {/* SessionDetail Content */}
            <SessionDetail />
          </div>
        </>
      )}

      {/* Fullscreen mode */}
      {sessionId && isFullScreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Panel control buttons - Top left */}
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
            {searchParams.get('from') === 'work-item' && (
              <Tooltip content={t('common:layout.returnToWorkItem')}>
                <button
                  onClick={handleClose}
                  className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                </button>
              </Tooltip>
            )}
            <Tooltip content={t('common:layout.restore')}>
              <button
                onClick={toggleFullScreen}
                className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <Minimize2 className="w-4 h-4 text-gray-600" />
              </button>
            </Tooltip>
            <Tooltip content="Close">
              <button
                onClick={() => navigate('/')}
                className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </Tooltip>
          </div>

          {/* SessionDetail Content */}
          <SessionDetail />
        </div>
      )}
    </div>
  );
};