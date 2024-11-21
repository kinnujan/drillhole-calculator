import { DatabaseService } from './DatabaseService';
import { DropboxService } from './DropboxService';
import { ErrorRecoveryService } from './ErrorRecoveryService';
import { LogEntry } from '../models/LogEntry';

export class SyncService {
  private static instance: SyncService;
  private dbService: DatabaseService;
  private dropboxService: DropboxService;
  private errorRecoveryService: ErrorRecoveryService;
  private syncInProgress: boolean = false;
  private lastSyncTimestamp: Date | null = null;
  private syncQueue: LogEntry[] = [];

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.dropboxService = DropboxService.getInstance();
    this.errorRecoveryService = ErrorRecoveryService.getInstance();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  async startBackgroundSync(intervalMinutes: number = 5): Promise<void> {
    if (!navigator.onLine) {
      console.log('Device is offline, will retry when online');
      window.addEventListener('online', () => this.sync());
      return;
    }

    setInterval(() => {
      if (!this.syncInProgress && navigator.onLine) {
        this.sync();
      }
    }, intervalMinutes * 60 * 1000);
  }

  async sync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    try {
      this.syncInProgress = true;

      // Create backup before sync
      await this.errorRecoveryService.createBackup();

      // Get all unsynced entries
      const unsyncedEntries = await this.dbService.getUnsyncedEntries();
      if (unsyncedEntries.length === 0 && this.syncQueue.length === 0) {
        console.log('No changes to sync');
        return;
      }

      // Add unsynced entries to queue
      this.syncQueue.push(...unsyncedEntries);

      // Process sync queue
      while (this.syncQueue.length > 0) {
        const entry = this.syncQueue[0];
        
        try {
          // Check for conflicts
          const remoteEntry = await this.dropboxService.getEntry(entry.id);
          if (remoteEntry && new Date(remoteEntry.modified) > new Date(entry.modified)) {
            // Remote version is newer, handle conflict
            await this.handleConflict(entry, remoteEntry);
          } else {
            // Upload local changes
            await this.dropboxService.uploadEntry(entry);
            await this.dbService.markAsSynced(entry.id);
          }

          // Remove from queue after successful sync
          this.syncQueue.shift();
        } catch (error) {
          console.error('Error syncing entry:', error);
          await this.errorRecoveryService.logError('Sync failed for entry', error.message);
          // Keep entry in queue for retry
          break;
        }
      }

      // Update last sync timestamp
      this.lastSyncTimestamp = new Date();
    } catch (error) {
      console.error('Sync failed:', error);
      await this.errorRecoveryService.logError('Sync failed', error.message);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async handleConflict(localEntry: LogEntry, remoteEntry: LogEntry): Promise<void> {
    // Create a backup of the local entry
    const conflictBackup = {
      ...localEntry,
      id: `${localEntry.id}_local_${new Date().getTime()}`,
    };
    await this.dbService.addEntry(conflictBackup);

    // Update local entry with remote changes
    await this.dbService.updateEntry(remoteEntry);
    await this.dbService.markAsSynced(remoteEntry.id);
  }

  async queueForSync(entry: LogEntry): Promise<void> {
    this.syncQueue.push(entry);
    if (navigator.onLine && !this.syncInProgress) {
      await this.sync();
    }
  }

  getLastSyncTimestamp(): Date | null {
    return this.lastSyncTimestamp;
  }

  getSyncStatus(): { inProgress: boolean; queueLength: number } {
    return {
      inProgress: this.syncInProgress,
      queueLength: this.syncQueue.length,
    };
  }
}
