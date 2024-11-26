import Dexie from 'dexie';
import { LogEntry, BackupEntry, ErrorLog, EditLogEntry, OverlapResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import historyService, { OverlapResolutionCommand } from './HistoryService';

class QuickLoggerDB extends Dexie {
  logEntries!: Dexie.Table<LogEntry, string>;
  backupEntries!: Dexie.Table<BackupEntry, string>;
  errorLogs!: Dexie.Table<ErrorLog, string>;
  editLog!: Dexie.Table<EditLogEntry, string>;

  private roundToDecimalPlaces(num: number, places: number = 6): number {
    return Number(Math.round(Number(num + 'e' + places)) + 'e-' + places);
  }

  constructor() {
    super('QuickLoggerDB');
    
    this.version(4).stores({
      logEntries: 'id,drillhole_id,from,to,synced,originalEntryId',
      backupEntries: 'id,timestamp,entryId',
      errorLogs: 'id,timestamp,type',
      editLog: 'id,userId,timestamp,operation,originalEntryId,entryData'
    });

    // Add hooks for data validation
    this.logEntries.hook('creating', (primKey, obj) => {
      // Ensure required fields are present
      if (!obj.id || !obj.drillhole_id || obj.from === undefined || obj.to === undefined) {
        throw new Error('Missing required fields');
      }

      // Validate numeric fields
      if (typeof obj.from !== 'number' || typeof obj.to !== 'number') {
        throw new Error('From and To must be numbers');
      }

      // Round the values
      const fromRounded = this.roundToDecimalPlaces(obj.from);
      const toRounded = this.roundToDecimalPlaces(obj.to);

      // Use epsilon for comparison
      const epsilon = 1e-10;
      if (fromRounded >= (toRounded - epsilon)) {
        throw new Error('From must be less than To');
      }

      // Update the object with rounded values
      obj.from = fromRounded;
      obj.to = toRounded;

      return obj;
    });

    this.logEntries.hook('updating', (modifications, primKey, obj) => {
      if (modifications.hasOwnProperty('from') || modifications.hasOwnProperty('to')) {
        const from = modifications.from ?? obj.from;
        const to = modifications.to ?? obj.to;

        // Validate numeric fields
        if (typeof from !== 'number' || typeof to !== 'number') {
          throw new Error('From and To must be numbers');
        }

        // Round the values
        const fromRounded = this.roundToDecimalPlaces(from);
        const toRounded = this.roundToDecimalPlaces(to);

        // Use epsilon for comparison
        const epsilon = 1e-10;
        if (fromRounded >= (toRounded - epsilon)) {
          throw new Error('From must be less than To');
        }

        // Update the modifications with rounded values
        modifications.from = fromRounded;
        modifications.to = toRounded;
      }
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

  private async addEntryWithoutCheck(entry: LogEntry): Promise<LogEntry> {
    await this.initialize();
    console.log(`[DB] Adding entry without overlap check:`, entry);

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

    // Add the entry
    await this.db.logEntries.add(entry);
    this.notifyListeners('entry-added', { entry });
    return entry;
  }

  public async addEntry(entry: LogEntry, skipOverlapCheck: boolean = false): Promise<LogEntry> {
    if (skipOverlapCheck) {
      return this.addEntryWithoutCheck(entry);
    }

    await this.initialize();
    console.log(`[DB] Adding entry:`, entry);

    // Check for overlaps before adding
    const overlapResult = await this.checkOverlap(entry);
    if (overlapResult.hasOverlap) {
      console.log(`[DB] Overlap detected:`, overlapResult);
      // Notify listeners about overlap - UI will handle confirmation
      this.notifyListeners('overlap', {
        newEntry: entry,
        overlapResult
      });
      throw new Error('OVERLAP_DETECTED');
    }

    return this.addEntryWithoutCheck(entry);
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

      // Validate the interval with proper decimal handling
      this.validateInterval(entry.from, entry.to);

      // Create a deep copy with preserved fields and metadata
      const updatedEntry = {
        ...existingEntry,
        ...entry,
        from: this.roundToDecimalPlaces(entry.from),
        to: this.roundToDecimalPlaces(entry.to),
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

  private roundToDecimalPlaces(num: number, places: number = 6): number {
    return Number(Math.round(Number(num + 'e' + places)) + 'e-' + places);
  }

  private validateInterval(from: number, to: number): void {
    // Convert to numbers and round to 6 decimal places to avoid floating point issues
    const fromNum = this.roundToDecimalPlaces(Number(from));
    const toNum = this.roundToDecimalPlaces(Number(to));

    if (isNaN(fromNum) || isNaN(toNum)) {
      console.error('[DB] Invalid from/to values:', { from, to });
      throw new Error('From and To must be valid numbers');
    }

    // Use a small epsilon for floating point comparisons
    const epsilon = 1e-10;
    if (fromNum >= (toNum - epsilon)) {
      console.error('[DB] Invalid interval:', { from: fromNum, to: toNum });
      throw new Error('From must be less than To');
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
      
      // Start transaction
      await this.db.transaction('rw', [this.db.logEntries, this.db.backupEntries], async () => {
        // Save backup first
        await this.db.backupEntries.add(backup);
        
        // Delete the entry
        console.log('[DB] Deleting original entry:', id);
        await this.db.logEntries.delete(id);
      });
      
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

      // Validate numeric fields for both halves
      const validateHalf = (entry: LogEntry, label: string) => {
        const from = Number(entry.from);
        const to = Number(entry.to);
        if (isNaN(from) || isNaN(to)) {
          throw new Error(`Invalid numbers in ${label} half of split`);
        }
        if (from >= to) {
          throw new Error(`Invalid range in ${label} half of split`);
        }
      };

      validateHalf(firstHalf, 'first');
      validateHalf(secondHalf, 'second');

      // Verify the split point is valid
      if (firstHalf.to !== secondHalf.from) {
        throw new Error('Split point mismatch between first and second half');
      }

      console.log('[DB] Original entry verified:', existingEntry);

      // Create backup before split
      const backup = {
        id: uuidv4(),
        entry: existingEntry,
        timestamp: new Date()
      };
      
      // Start transaction
      console.log('[DB] Starting split transaction');
      await this.db.transaction('rw', [this.db.logEntries, this.db.backupEntries], async () => {
        // Save backup first
        await this.db.backupEntries.add(backup);
        
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

  public async handleOverlap(newEntry: LogEntry, existingEntry: LogEntry, action: 'split' | 'replace' | 'adjust'): Promise<void> {
    console.log('[DB] Handling overlap:', { action, newEntry, existingEntry });
    
    // Round decimal values to avoid floating point comparison issues
    const roundedNewEntry = {
      ...newEntry,
      from: this.roundToDecimalPlaces(newEntry.from),
      to: this.roundToDecimalPlaces(newEntry.to)
    };

    const roundedExistingEntry = {
      ...existingEntry,
      from: this.roundToDecimalPlaces(existingEntry.from),
      to: this.roundToDecimalPlaces(existingEntry.to)
    };

    // Get current state before any changes
    const originalState = await this.getEntriesByHole(existingEntry.drillhole_id);
    let newState: LogEntry[] = [];
    
    try {
      if (action === 'adjust') {
        // Adjust the new entry to avoid overlap
        let adjustedEntry: LogEntry;
        
        if (roundedNewEntry.from < roundedExistingEntry.from && roundedNewEntry.to > roundedExistingEntry.from) {
          // New entry overlaps at start of existing - adjust to end at existing start
          adjustedEntry = {
            ...roundedNewEntry,
            to: roundedExistingEntry.from
          };
        } else if (roundedNewEntry.from < roundedExistingEntry.to && roundedNewEntry.to > roundedExistingEntry.to) {
          // New entry overlaps at end of existing - adjust to start at existing end
          adjustedEntry = {
            ...roundedNewEntry,
            from: roundedExistingEntry.to
          };
        } else {
          throw new Error('Cannot adjust: invalid overlap scenario');
        }

        // New state is all existing entries plus the adjusted entry
        newState = [...originalState, adjustedEntry];

      } else if (action === 'replace') {
        // Only fully replace if new entry completely contains existing
        if (roundedNewEntry.from <= roundedExistingEntry.from && roundedNewEntry.to >= roundedExistingEntry.to) {
          // Remove existing entry, add new entry
          newState = [...originalState.filter(e => e.id !== existingEntry.id), roundedNewEntry];
        } else {
          // For partial overlaps, keep the non-overlapping parts
          if (roundedNewEntry.from > roundedExistingEntry.from) {
            // Keep the part before new entry
            const beforePart = {
              ...existingEntry,
              id: uuidv4(),
              to: roundedNewEntry.from
            };
            newState.push(beforePart);
          }
          
          // Add the new entry
          newState.push(roundedNewEntry);
          
          if (roundedNewEntry.to < roundedExistingEntry.to) {
            // Keep the part after new entry
            const afterPart = {
              ...existingEntry,
              id: uuidv4(),
              from: roundedNewEntry.to
            };
            newState.push(afterPart);
          }

          // Add all other existing entries
          newState.push(...originalState.filter(e => e.id !== existingEntry.id));
        }
      }

      // Create and execute history command
      const command = new OverlapResolutionCommand(existingEntry.drillhole_id, originalState, newState);
      await historyService.executeCommand(command);

    } catch (error) {
      console.error('[DB] Error handling overlap:', error);
      throw error;
    }
  }

  public async checkOverlap(entry: LogEntry): Promise<OverlapResult> {
    await this.initialize();
    console.log(`[DB] Checking for overlaps:`, entry);

    const entries = await this.db.logEntries
      .where('drillhole_id')
      .equals(entry.drillhole_id)
      .filter(e => 
        // Exclude the entry itself if it's an update
        e.id !== entry.id &&
        // Check for any type of overlap
        !((e.to <= entry.from) || (e.from >= entry.to))
      )
      .toArray();

    if (entries.length === 0) {
      return {
        hasOverlap: false,
        type: 'none',
        overlappingEntries: []
      };
    }

    // Determine overlap type for first overlapping entry
    const overlappingEntry = entries[0];
    let type: 'contains' | 'contained' | 'partial' | 'none';

    if (overlappingEntry.from <= entry.from && overlappingEntry.to >= entry.to) {
      type = 'contains'; // Existing entry contains new entry
    } else if (entry.from <= overlappingEntry.from && entry.to >= overlappingEntry.to) {
      type = 'contained'; // New entry contains existing entry
    } else {
      type = 'partial'; // Partial overlap
    }

    return {
      hasOverlap: true,
      type,
      overlappingEntries: entries
    };
  }
}

// Create and export singleton instance
const databaseService = new DatabaseService();
Object.freeze(databaseService);
export default databaseService;
