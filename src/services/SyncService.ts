import { EditLogEntry, LogEntry } from '../types';
import databaseService from './DatabaseService';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export class SyncService {
  private initialized = false;
  private syncInProgress = false;
  private editQueue: EditLogEntry[] = [];
  private lastSyncTimestamp: Date | null = null;
  private userId: string;

  constructor() {
    console.log('[SYNC] Creating SyncService instance');
    // Generate or retrieve user ID
    this.userId = localStorage.getItem('quicklogger_user_id') || uuidv4();
    localStorage.setItem('quicklogger_user_id', this.userId);
    console.log(`[SYNC] Using user ID: ${this.userId}`);

    // Listen for database changes
    databaseService.addChangeListener((type, data) => {
      console.log(`[SYNC] Received database event: ${type}`, data);
      if (type === 'add' || type === 'update' || type === 'delete') {
        console.log(`[SYNC] Queueing ${type} operation for sync`);
        this.queueEdit(type, data);
      }
    });
    console.log('[SYNC] SyncService initialization complete');
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

  async queueEdit(operation: 'add' | 'edit' | 'delete', entry: LogEntry, originalEntryId?: string): Promise<void> {
    console.log(`[SYNC] Queueing ${operation} operation for entry:`, entry);
    
    const editEntry: EditLogEntry = {
      id: uuidv4(),
      userId: this.userId,
      timestamp: new Date(),
      operation,
      entryData: entry,
      originalEntryId
    };

    console.log('[SYNC] Created edit log entry:', editEntry);
    this.editQueue.push(editEntry);

    // Try to sync if online
    if (navigator.onLine) {
      console.log('[SYNC] Online connection detected, attempting immediate sync');
      await this.sync();
    } else {
      console.log('[SYNC] Offline - edit queued for later sync');
    }
  }

  private async generateCSV(): Promise<string> {
    console.log('[SYNC] Generating CSV from latest entries');
    // Get all entries from database
    const entries = await databaseService.getLatestEntries();
    console.log(`[SYNC] Retrieved ${entries.length} entries for CSV generation`);

    // Convert to CSV format
    const csvData = entries.map(entry => ({
      id: entry.id,
      drillhole_id: entry.drillhole_id,
      from: entry.from,
      to: entry.to,
      lithology: entry.lithology,
      color: entry.color,
      texture: entry.texture,
      minerals: entry.minerals,
      mineralized: entry.mineralized,
      structures: entry.structures,
      notes: entry.notes,
      created: entry.created.toISOString(),
      modified: entry.modified.toISOString(),
      synced: entry.synced
    }));

    console.log('[SYNC] Converting entries to CSV format');
    const csv = Papa.unparse(csvData);
    console.log(`[SYNC] Generated CSV with ${csvData.length} rows`);
    return csv;
  }

  async sync(retryCount: number = 0): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = (count: number) => Math.pow(2, count) * 1000; // Exponential backoff

    if (this.syncInProgress) {
      console.log('[SYNC] Sync already in progress, skipping');
      return;
    }

    console.log(`[SYNC] Starting sync (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

    try {
      this.syncInProgress = true;
      console.log('[SYNC] Checking for unsynced edits');

      // Get unsynced edits
      const unsyncedEdits = this.editQueue;
      if (unsyncedEdits.length === 0) {
        console.log('[SYNC] No changes to sync');
        return;
      }

      console.log(`[SYNC] Found ${unsyncedEdits.length} unsynced edits`);

      // Generate CSV
      console.log('[SYNC] Generating CSV for sync');
      const csv = await this.generateCSV();

      // Upload to cloud storage
      console.log('[SYNC] Uploading to cloud storage');
      await this.uploadToCloud({
        timestamp: new Date().toISOString(),
        userId: this.userId,
        editLog: unsyncedEdits,
        csvContent: csv
      });

      // Mark edits as synced
      console.log('[SYNC] Marking edits as synced');
      this.editQueue = [];

      this.lastSyncTimestamp = new Date();
      console.log(`[SYNC] Sync completed successfully at ${this.lastSyncTimestamp.toISOString()}`);
    } catch (error) {
      console.error('[SYNC] Sync failed:', error);
      
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY(retryCount);
        console.log(`[SYNC] Retrying sync in ${delay}ms...`);
        setTimeout(() => this.sync(retryCount + 1), delay);
      } else {
        console.error('[SYNC] Max retry attempts reached, sync failed');
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private async uploadToCloud(data: any): Promise<void> {
    console.log('[SYNC] Starting cloud upload');
    // Mock implementation - will be replaced with actual cloud storage
    return new Promise((resolve) => {
      console.log('[SYNC] Simulating cloud upload...');
      setTimeout(() => {
        console.log('[SYNC] Mock cloud upload complete');
        resolve();
      }, 1000);
    });
  }

  getLastSyncTimestamp(): Date | null {
    return this.lastSyncTimestamp;
  }

  getUserId(): string {
    return this.userId;
  }
}

// Create and export singleton instance
const syncService = new SyncService();
Object.freeze(syncService);
export default syncService;
