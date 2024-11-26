import { LogEntry } from './LogEntry';

export interface EditLogEntry {
  id: string;
  userId: string;
  timestamp: Date;
  operation: 'add' | 'edit' | 'delete';
  entryData: LogEntry;
  originalEntryId?: string;
}

export interface SyncStatus {
  lastSync: Date | null;
  isSyncing: boolean;
  error: string | null;
  pendingChanges: number;
}
