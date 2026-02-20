import { Session, SessionStatus } from '../types/session.types';

export type SortType =
  | 'created_desc'  // Newest first
  | 'created_asc'   // Oldest first
  | 'updated_desc'  // Recently updated first
  | 'updated_asc'   // Least recently updated first
  | 'name_asc'      // Name A-Z
  | 'name_desc'     // Name Z-A
  | 'status'        // Status grouping (in progress first)
  | 'messages_desc' // Most messages first
  | 'messages_asc'; // Fewest messages first

export const sortSessions = (sessions: Session[], sortType: SortType): Session[] => {
  const sorted = [...sessions];
  
  switch (sortType) {
    case 'created_desc':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
    case 'created_asc':
      return sorted.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
    case 'updated_desc':
      return sorted.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
    case 'updated_asc':
      return sorted.sort((a, b) => 
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      );
      
    case 'name_asc':
      return sorted.sort((a, b) => 
        a.name.localeCompare(b.name, 'zh-TW')
      );
      
    case 'name_desc':
      return sorted.sort((a, b) => 
        b.name.localeCompare(a.name, 'zh-TW')
      );
      
    case 'status':
      // Status priority: processing > idle > completed > error > interrupted
      const statusPriority: Record<SessionStatus, number> = {
        [SessionStatus.PROCESSING]: 1,
        [SessionStatus.IDLE]: 2,
        [SessionStatus.COMPLETED]: 3,
        [SessionStatus.ERROR]: 4,
        [SessionStatus.INTERRUPTED]: 5
      };
      
      return sorted.sort((a, b) => {
        const priorityA = statusPriority[a.status] || 999;
        const priorityB = statusPriority[b.status] || 999;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        // If status is the same, sort by update time
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
    case 'messages_desc':
      return sorted.sort((a, b) => 
        (b.messageCount || 0) - (a.messageCount || 0)
      );
      
    case 'messages_asc':
      return sorted.sort((a, b) => 
        (a.messageCount || 0) - (b.messageCount || 0)
      );
      
    default:
      return sorted;
  }
};

export const getSortOptions = () => [
  { value: 'updated_desc', label: 'Recently Updated' },
  { value: 'created_desc', label: 'Newest First' },
  { value: 'created_asc', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'status', label: 'Status Priority' },
  { value: 'messages_desc', label: 'Most Messages' },
  { value: 'messages_asc', label: 'Fewest Messages' }
];