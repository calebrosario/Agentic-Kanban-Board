import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { SessionStatus } from '../types/session.types';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const { addEventListener, removeEventListener } = useWebSocket();

  const getStatusMessage = useCallback((status: string): string => {
    const statusMap: Record<string, { message: string; icon: string }> = {
      'processing': { message: '開始Handle', icon: '🔄' },
      'idle': { message: 'Handle完成', icon: '✅' },
      'completed': { message: '已完成', icon: '🎉' },
      'error': { message: '發生錯誤', icon: '❌' },
      'interrupted': { message: '已中斷', icon: '⚠️' }
    };

    const statusInfo = statusMap[status.toLowerCase()];
    if (!statusInfo) return `狀態Update: ${status}`;

    return `${statusInfo.icon} Session ${statusInfo.message}`;
  }, []);

  useEffect(() => {
    const handleGlobalStatusUpdate = (data: { sessionId: string; status: string }) => {
      // 將小寫狀態轉換為大寫的 enum 值
      const statusMap: Record<string, SessionStatus> = {
        'processing': SessionStatus.PROCESSING,
        'idle': SessionStatus.IDLE,
        'completed': SessionStatus.COMPLETED,
        'error': SessionStatus.ERROR,
        'interrupted': SessionStatus.INTERRUPTED
      };

      const mappedStatus = statusMap[data.status.toLowerCase()];
      if (!mappedStatus) return;

      // 只在重要狀態變更時顯示通知
      if (mappedStatus === SessionStatus.IDLE || 
          mappedStatus === SessionStatus.ERROR ||
          mappedStatus === SessionStatus.COMPLETED) {
        const message = getStatusMessage(data.status);
        
        // 根據狀態類型顯示不同的通知
        if (mappedStatus === SessionStatus.ERROR) {
          toast.error(message);
        } else {
          toast.success(message, {
            duration: 3000,
            position: 'top-right'
          });
        }
      }
    };

    const handleGlobalProcessExit = (data: { sessionId: string; code: number | null }) => {
      if (data.code !== 0) {
        toast.error(`❌ Session 執行失敗 (代碼: ${data.code || '未知'})`);
      }
    };

    // 監聽全域事件
    addEventListener('global_status_update', handleGlobalStatusUpdate);
    addEventListener('global_process_exit', handleGlobalProcessExit);

    return () => {
      removeEventListener('global_status_update', handleGlobalStatusUpdate);
      removeEventListener('global_process_exit', handleGlobalProcessExit);
    };
  }, [addEventListener, removeEventListener, getStatusMessage]);
};