import { useSessionsContext } from '../contexts/SessionsContext';

// 這個 hook 現在只是一個簡單的 wrapper，為了保持向後兼容
export const useSessions = () => {
  return useSessionsContext();
};