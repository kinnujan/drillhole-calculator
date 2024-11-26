import Dexie from 'dexie';
import { LogEntry, BackupEntry, ErrorLog, EditLogEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

class QuickLoggerDB extends Dexie {
  logEntries!: Dexie.Table<LogEntry, string>;
  backupEntries!: Dexie.Table<BackupEntry, string>;
  errorLogs!: Dexie.Table<ErrorLog, string>;
  editLog!: Dexie.Table<EditLogEntry, string>;

  constructor() {
    super('QuickLoggerDB');
    
    this.version(4).stores({
      logEntries: 'id,drillhole_id,from,to,synced,originalEntryId',
      backupEntries: 'id,timestamp,entryId',
      errorLogs: 'id,timestamp,type',
      editLog: 'id,userId,timestamp,operation,originalEntryId,entryData'
    });

    // Add hooks for data validation
    this.logEntries.hook('creating', function(primKey, obj) {
      // Ensure required fields are present
      if (!obj.id || !obj.drillhole_id || obj.from === undefined || obj.to === undefined) {
        throw new Error('Missing required fields');
      }

      // Validate numeric fields
      if (typeof obj.from !== 'number' || typeof obj.to !== 'number') {
        throw new Error('From and To must be numbers');
      }

      // Validate interval
      if (obj.from >= obj.to) {
        throw new Error('From must be less than To');
      }

      return obj;
    });
  }
}

interface DatabaseState {
  initialized: boolean;
  initializationState: {
    promise: Promise<void> | null;
    resolve: ((value: void | PromiseLike<void>) => void) | null;
    reject: ((reason?: any) => void) | null;
  };
  changeListeners: ((type: string, data: any) => void)[];
}

export class DatabaseService {
  private db: QuickLoggerDB;
  private state: DatabaseState;

  constructor() {
    console.log('[DB] Creating DatabaseService instance');
    this.db = new QuickLoggerDB();
    this.state = {
      initialized: false,
      initializationState: {
        promise: null,
        resolve: null,
        reject: null
      },
      changeListeners: []
    };
  }

  public addChangeListener(listener: (type: string, data: any) => void) {
    console.log('[DB] Adding new change listener');
    this.state.changeListeners.push(listener);
    console.log(`[DB] Current listener count: ${this.state.changeListeners.length}`);
  }

  public removeChangeListener(listener: (type: string, data: any) => void) {
    console.log('[DB] Removing change listener');
    const initialCount = this.state.changeListeners.length;
    this.state.changeListeners = this.state.changeListeners.filter(l => l !== listener);
    console.log(`[DB] Listeners removed: ${initialCount - this.state.changeListeners.length}`);
  }

  private notifyListeners(type: string, data: any) {
    console.log(`[DB] Notifying listeners of event: ${type}`, data);
    this.state.changeListeners.forEach(listener => {
      try {
        listener(type, data);
      } catch (error) {
        console.error(`[DB] Error in listener for event ${type}:`, error);
      }
    });
    console.log(`[DB] Finished notifying listeners for event: ${type}`);
  }

  public async initialize(): Promise<void> {
    console.log('[DB] Initialize called');
    console.debug('[DB] Current state:', {
      initialized: this.state.initialized,
      hasInitPromise: !!this.state.initializationState.promise,
      listenerCount: this.state.changeListeners.length
    });

    // If already initialized, return immediately
    if (this.state.initialized) {
      console.log('[DB] Already initialized, returning...');
      return;
    }

    // If initialization is in progress, wait for it
    if (this.state.initializationState.promise) {
      console.log('[DB] Initialization in progress, waiting...');
      return this.state.initializationState.promise;
    }

    console.log('[DB] Starting new initialization...');
    this.state.initializationState.promise = new Promise((resolve, reject) => {
      this.state.initializationState.resolve = resolve;
      this.state.initializationState.reject = reject;
    });

    try {
      // Open the database first
      await this.db.open();
      
      // Then run internal initialization
      await this.initializeInternal();
      
      // Mark as initialized only after successful initialization
      this.state.initialized = true;
      console.log('[DB] Initialization completed successfully');
      this.state.initializationState.resolve?.();
    } catch (error) {
      console.error('[DB] Initialization failed:', error);
      this.state.initialized = false;  // Ensure we can retry initialization
      this.state.initializationState.reject?.(error);
      throw error;
    } finally {
      // Clean up initialization state
      this.state.initializationState.promise = null;
      this.state.initializationState.resolve = null;
      this.state.initializationState.reject = null;
    }
  }

  private async initializeInternal(): Promise<void> {
    console.log('[DB] Starting internal initialization');
    try {
      // Check if we already have data
      const count = await this.db.logEntries.count();
      console.log('[DB] Current entry count:', count);

      if (count === 0) {
        console.log('[DB] Empty database, notifying listeners to load initial data...');
        this.notifyListeners('init', { isEmpty: true });
      } else {
        console.log('[DB] Database already contains data, skipping initial load');
        this.notifyListeners('init', { isEmpty: false });
      }
    } catch (error) {
      console.error('[DB] Initialization failed:', error);
      throw error;
    } finally {
      console.log('[DB] Internal initialization completed');
    }
  }

  public async addEntry(entry: LogEntry): Promise<LogEntry> {
    await this.initialize();
    console.log(`[DB] Adding entry:`, entry);

    // Ensure entry has an ID
    if (!entry.id) {
      entry.id = uuidv4();
    }

    // Set timestamps if not present
    if (!entry.created) {
      entry.created = new Date();
    }
    entry.modified = new Date();

    // Ensure fields object exists
    if (!entry.fields) {
      entry.fields = {};
    }

    // Create a deep copy and ensure numeric fields are numbers
    const entryToAdd = {
      ...entry,
      from: Number(entry.from),
      to: Number(entry.to),
      fields: { ...entry.fields },
      created: new Date(entry.created),
      modified: new Date()
    };

    try {
      await this.db.logEntries.add(entryToAdd);
      console.log(`[DB] Successfully added entry with ID: ${entryToAdd.id}`);
      this.notifyListeners('add', entryToAdd);
      return entryToAdd;
    } catch (error) {
      console.error(`[DB] Error adding entry:`, error);
      throw error;
    }
  }

  public async updateEntry(entry: LogEntry): Promise<LogEntry> {
    await this.initialize();
    console.log(`[DB] Updating entry:`, entry);

    if (!entry.id) {
      console.error('[DB] Cannot update entry without ID');
      throw new Error('Entry ID is required for update');
    }

    try {
      // Get the existing entry
      const existingEntry = await this.db.logEntries.get(entry.id);
      if (!existingEntry) {
        console.error(`[DB] Entry with ID ${entry.id} not found`);
        throw new Error(`Entry with ID ${entry.id} not found`);
      }

      // Validate numeric fields
      if (typeof entry.from !== 'number' || typeof entry.to !== 'number') {
        console.error('[DB] Invalid from/to values:', { from: entry.from, to: entry.to });
        throw new Error('From and To must be numbers');
      }

      // Validate interval
      if (entry.from >= entry.to) {
        console.error('[DB] Invalid interval:', { from: entry.from, to: entry.to });
        throw new Error('From must be less than To');
      }

      // Create a deep copy with preserved fields and metadata
      const updatedEntry = {
        ...existingEntry,
        ...entry,
        fields: { ...existingEntry.fields, ...entry.fields },
        created: existingEntry.created,
        modified: new Date(),
        synced: false // Mark as unsynced when updated
      };

      // Backup the existing entry before update
      await this.backupEntry(existingEntry);

      // Perform the update
      await this.db.logEntries.put(updatedEntry);
      console.log(`[DB] Successfully updated entry:`, updatedEntry);
      
      // Notify listeners after successful update
      this.notifyListeners('update', updatedEntry);
      
      return updatedEntry;
    } catch (error) {
      console.error(`[DB] Error updating entry:`, error);
      throw error;
    }
  }

  public async deleteEntry(id: string): Promise<void> {
    try {
      await this.initialize();
      console.log(`[DB] Deleting entry with ID: ${id}`);
      
      // First check if entry exists
      const entry = await this.db.logEntries.get(id);
      if (!entry) {
        console.error(`[DB] Entry ${id} not found for deletion`);
        throw new Error(`Entry ${id} not found`);
      }

      // Get the entry before deletion for backup
      const backup = {
        id: uuidv4(),  // Generate new ID for backup
        entry: entry,
        timestamp: new Date()
      };
      await this.db.backupEntries.add(backup);

      // Delete the entry
      await this.db.logEntries.delete(id);
      
      console.log(`[DB] Successfully deleted entry ${id}`);
      this.notifyListeners('delete', id);
    } catch (error) {
      console.error(`[DB] Error deleting entry ${id}:`, error);
      throw error;
    }
  }

  public async deleteEntriesByOriginalId(originalId: string): Promise<void> {
    await this.initialize();
    if (!originalId) {
      throw new Error('Cannot delete entries: originalId is required');
    }
    
    try {
      // First find all entries with this originalId
      const entriesToDelete = await this.db.logEntries
        .where('originalEntryId')
        .equals(originalId)
        .toArray();
      
      // Delete each entry and its backup
      for (const entry of entriesToDelete) {
        if (entry.id) {
          await this.db.logEntries.delete(entry.id);
          await this.deleteBackup(entry.id);
        }
      }
      this.notifyListeners('delete', originalId);
    } catch (error) {
      console.error('Error deleting entries:', error);
      throw new Error('Failed to delete split entries');
    }
  }

  public async getEntry(id: string): Promise<LogEntry | undefined> {
    await this.initialize();
    console.log(`[DB] Getting entry with ID: ${id}`);
    const entry = await this.db.logEntries.get(id);
    console.log(`[DB] Entry found:`, entry);
    return entry;
  }

  public async getAllEntries(): Promise<LogEntry[]> {
    await this.initialize();
    return await this.db.logEntries.toArray();
  }

  public async getEntriesByHole(drillholeId: string): Promise<LogEntry[]> {
    await this.initialize();
    console.log(`[DB] Getting entries for drillhole: ${drillholeId}`);
    
    try {
      const entries = await this.db.logEntries
        .where('drillhole_id')
        .equals(drillholeId)
        .sortBy('from');

      console.log(`[DB] Found ${entries.length} entries for drillhole ${drillholeId}`);
      entries.forEach((entry, index) => {
        console.log(`[DB] Entry ${index + 1}:`, {
          id: entry.id,
          from: entry.from,
          to: entry.to,
          lithology: entry.lithology
        });
      });

      return entries;
    } catch (error) {
      console.error(`[DB] Error getting entries for drillhole ${drillholeId}:`, error);
      throw error;
    }
  }

  public async getUnsyncedEntries(): Promise<LogEntry[]> {
    await this.initialize();
    return await this.db.logEntries
      .where('synced')
      .equals(false)
      .toArray();
  }

  public async markAsSynced(id: string): Promise<void> {
    await this.initialize();
    await this.db.logEntries.update(id, { synced: true });
    this.notifyListeners('sync', id);
  }

  public async backupEntry(entry: LogEntry): Promise<void> {
    await this.initialize();
    
    // Create a deep copy of the entry to ensure no references are shared
    const backupEntry: BackupEntry = {
      id: entry.id,
      entry: JSON.parse(JSON.stringify(entry)),  // Deep copy
      timestamp: new Date()
    };
    
    await this.db.backupEntries.add(backupEntry);
    this.notifyListeners('backup', backupEntry);
  }

  public async getBackupEntry(id: string): Promise<LogEntry | undefined> {
    try {
      await this.initialize();

      // Get all backups for this ID
      const backups = await this.db.backupEntries
        .where('entry.id')
        .equals(id)
        .toArray();

      if (backups.length === 0) {
        console.log('No backup found for entry:', id);
        return undefined;
      }

      // Return the most recent backup
      const latestBackup = backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      return latestBackup.entry;
    } catch (error) {
      console.error('Error getting backup entry:', error);
      return undefined;
    }
  }

  public async deleteBackup(id: string): Promise<void> {
    await this.initialize();
    await this.db.backupEntries.where('id').equals(id).delete();
    this.notifyListeners('deleteBackup', id);
  }

  public async addBackup(backup: BackupEntry): Promise<string> {
    await this.initialize();
    return await this.db.backupEntries.add(backup);
  }

  public async logError(error: ErrorLog): Promise<string> {
    await this.initialize();
    return await this.db.errorLogs.add(error);
  }

  public async splitEntry(originalEntry: LogEntry, firstHalf: LogEntry, secondHalf: LogEntry): Promise<void> {
    console.log('[DB] Starting split entry operation:', {
      originalId: originalEntry.id,
      firstHalfId: firstHalf.id,
      secondHalfId: secondHalf.id
    });

    try {
      // Verify the original entry still exists
      const existingEntry = await this.getEntry(originalEntry.id);
      if (!existingEntry) {
        const error = new Error(`Original entry ${originalEntry.id} no longer exists`);
        console.error('[DB] Split failed:', error);
        throw error;
      }
      console.log('[DB] Original entry verified:', existingEntry);

      // Start transaction
      console.log('[DB] Starting split transaction');
      await this.db.transaction('rw', this.db.logEntries, async () => {
        // Delete original entry
        console.log('[DB] Deleting original entry:', originalEntry.id);
        await this.db.logEntries.delete(originalEntry.id);

        // Add new entries
        console.log('[DB] Adding first half entry:', firstHalf);
        await this.db.logEntries.add(firstHalf);
        
        console.log('[DB] Adding second half entry:', secondHalf);
        await this.db.logEntries.add(secondHalf);
      });
      console.log('[DB] Split transaction completed successfully');
      this.notifyListeners('split', { originalId: originalEntry.id, firstHalfId: firstHalf.id, secondHalfId: secondHalf.id });
    } catch (error) {
      console.error('[DB] Error during split operation:', error);
      throw error;
    }
  }

  public async unsplitEntry(originalEntry: LogEntry, firstHalfId: string, secondHalfId: string): Promise<void> {
    console.log('[DB] Starting unsplit entry operation:', {
      originalId: originalEntry.id,
      firstHalfId,
      secondHalfId
    });

    try {
      // Verify the split entries still exist
      const firstHalf = await this.getEntry(firstHalfId);
      const secondHalf = await this.getEntry(secondHalfId);
      
      if (!firstHalf || !secondHalf) {
        const error = new Error(`Split entries no longer exist: ${!firstHalf ? firstHalfId : ''} ${!secondHalf ? secondHalfId : ''}`);
        console.error('[DB] Unsplit failed:', error);
        throw error;
      }
      console.log('[DB] Split entries verified:', { firstHalf, secondHalf });

      // Start transaction
      console.log('[DB] Starting unsplit transaction');
      await this.db.transaction('rw', this.db.logEntries, async () => {
        // Delete split entries
        console.log('[DB] Deleting first half entry:', firstHalfId);
        await this.db.logEntries.delete(firstHalfId);
        
        console.log('[DB] Deleting second half entry:', secondHalfId);
        await this.db.logEntries.delete(secondHalfId);

        // Add original entry back
        console.log('[DB] Adding original entry back:', originalEntry);
        await this.db.logEntries.add(originalEntry);
      });
      console.log('[DB] Unsplit transaction completed successfully');
      this.notifyListeners('unsplit', { originalId: originalEntry.id, firstHalfId, secondHalfId });
    } catch (error) {
      console.error('[DB] Error during unsplit operation:', error);
      throw error;
    }
  }

  public async saveEntry(entry: LogEntry): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.logEntries, async () => {
        entry.modified = new Date();
        entry.synced = false;
        await this.db.logEntries.put(entry);
      });
      this.notifyListeners('save', entry);
    } catch (error) {
      console.error('Error saving entry:', error);
      throw error;
    }
  }

  public async saveEditLogEntry(edit: EditLogEntry): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.editLog, this.db.logEntries, async () => {
        // Save the edit log entry
        await this.db.editLog.put(edit);
        
        // Update the actual entry
        if (edit.operation !== 'delete') {
          await this.saveEntry(edit.entryData);
        } else if (edit.originalEntryId) {
          await this.db.logEntries.delete(edit.originalEntryId);
        }
      });
      this.notifyListeners('saveEdit', edit);
    } catch (error) {
      console.error('Error saving edit log entry:', error);
      throw error;
    }
  }

  public async getUnsynedEdits(): Promise<EditLogEntry[]> {
    return await this.db.editLog
      .where('synced')
      .equals(false)
      .toArray();
  }

  public async getLatestEntries(): Promise<LogEntry[]> {
    return await this.db.logEntries.toArray();
  }

  public async markEditsSynced(editIds: string[]): Promise<void> {
    await this.db.editLog
      .where('id')
      .anyOf(editIds)
      .modify({ synced: true });
    this.notifyListeners('syncEdits', editIds);
  }
}

// Create and export singleton instance
const databaseService = new DatabaseService();
Object.freeze(databaseService);
export default databaseService;
