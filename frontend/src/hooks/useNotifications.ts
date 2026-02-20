import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { SessionStatus } from '../types/session.types';
import toast from 'react-hot-toast';

export const useNotifications = () => {
  const { addEventListener, removeEventListener } = useWebSocket();

  const getStatusMessage = useCallback((status: string): string => {
    const statusMap: Record<string, { message: string; icon: string }> = {
      'processing': { message: 'Starting', icon: '🔄' },
      'idle': { message: 'Handle complete', icon: '✅' },
      'completed': { message: 'Completed', icon: '🎉' },
      'error': { message: 'Error occurred', icon: '❌' },
      'interrupted': { message: 'Interrupted', icon: '⚠️' }
    };

    const statusInfo = statusMap[status.toLowerCase()];
    if (!statusInfo) return `Status update: ${status}`;

    return `${statusInfo.icon} Session ${statusInfo.message}`;
  }, []);

  useEffect(() => {
    const handleGlobalStatusUpdate = (data: { sessionId: string; status: string }) => {
      // Map lowercase status to SessionStatus enum
      const statusMap: Record<string, SessionStatus> = {
        'processing': SessionStatus.PROCESSING,
        'idle': SessionStatus.IDLE,
        'completed': SessionStatus.COMPLETED,
        'error': SessionStatus.ERROR,
        'interrupted': SessionStatus.INTERRUPTED
      };

      const mappedStatus = statusMap[data.status.toLowerCase()];
      if (!mappedStatus) return;

      // Only show notifications on important status changes
      if (mappedStatus === SessionStatus.IDLE ||
          mappedStatus === SessionStatus.ERROR ||
          mappedStatus === SessionStatus.COMPLETED) {
        const message = getStatusMessage(data.status);

        // Show different notifications based on status type
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
        toast.error(`❌ Session execution failed (code: ${data.code || 'unknown'})`);
      }
    };

    // Listen to global events
    addEventListener('global_status_update', handleGlobalStatusUpdate);
    addEventListener('global_process_exit', handleGlobalProcessExit);

    return () => {
      removeEventListener('global_status_update', handleGlobalStatusUpdate);
      removeEventListener('global_process_exit', handleGlobalProcessExit);
    };
  }, [addEventListener, removeEventListener, getStatusMessage]);
};