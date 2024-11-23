import Dexie from 'dexie';
import { LogEntry, BackupEntry, ErrorLog } from '../types';
import CSVService from './CSVService';
import { v4 as uuidv4 } from 'uuid';

class QuickLoggerDB extends Dexie {
  logEntries!: Dexie.Table<LogEntry, string>;
  backupEntries!: Dexie.Table<BackupEntry, string>;
  errorLogs!: Dexie.Table<ErrorLog, string>;

  constructor() {
    super('QuickLoggerDB');
    
    this.version(3).stores({
      logEntries: 'id,drillhole_id,from,to,synced,originalEntryId',
      backupEntries: 'id,timestamp,entryId',
      errorLogs: 'id,timestamp,type'
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

class DatabaseService {
  private static instance: DatabaseService;
  private db: QuickLoggerDB;
  private csvService: CSVService;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.db = new QuickLoggerDB();
    this.csvService = CSVService.getInstance();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async resetDatabase(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
      }
      await Dexie.delete('QuickLoggerDB');
      this.db = new QuickLoggerDB();
      this.initialized = false;
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    console.log('[DB] Starting initialization...');
    
    // Return existing initialization if in progress
    if (this.initPromise) {
      console.log('[DB] Initialization already in progress, waiting...');
      return this.initPromise;
    }

    // Return if already initialized
    if (this.initialized) {
      console.log('[DB] Already initialized, skipping...');
      return;
    }
    
    this.initPromise = (async () => {
      try {
        console.log('[DB] Loading configuration...');
        // Load configuration first
        await this.csvService.loadConfiguration();
        
        // Check if database is empty
        const entryCount = await this.db.logEntries.count();
        console.log(`[DB] Current entry count: ${entryCount}`);
        
        if (entryCount === 0) {
          console.log('[DB] Database empty, loading initial data...');
          // Load and validate CSV data only if database is empty
          const entries = await this.csvService.loadQuicklog();
          if (!entries || entries.length === 0) {
            console.log('[DB] No initial data to load');
            this.initialized = true;
            return;
          }

          console.log(`[DB] Transforming ${entries.length} entries...`);
          // Transform entries to match schema
          const validEntries = entries.map(entry => ({
            id: entry.id || uuidv4(),
            drillhole_id: entry.drillhole_id || '',
            from: Number(entry.from) || 0,
            to: Number(entry.to) || 0,
            lithology: entry.lithology || '',
            color: entry.color,
            texture: entry.texture,
            minerals: entry.minerals,
            mineralized: Boolean(entry.mineralized),
            structures: entry.structures,
            notes: entry.notes,
            fields: {},
            created: new Date(entry.created || Date.now()),
            modified: new Date(entry.modified || Date.now()),
            synced: Boolean(entry.synced),
            originalEntryId: entry.originalEntryId || null
          }));

          // Add entries in smaller batches
          const batchSize = 1;  // Process one at a time to identify problem entries
          for (let i = 0; i < validEntries.length; i += batchSize) {
            const batch = validEntries.slice(i, i + batchSize);
            try {
              await this.db.logEntries.bulkAdd(batch);
              console.log(`[DB] Added batch ${i + 1}/${Math.ceil(validEntries.length/batchSize)}`);
            } catch (error) {
              console.error(`[DB] Error adding batch starting at index ${i}:`, error);
              console.error('[DB] Problematic entries:', batch);
              throw error;
            }
          }
        } else {
          console.log('[DB] Database already contains data, skipping initial load');
        }
        
        this.initialized = true;
        console.log('[DB] Initialization completed successfully');
      } catch (error) {
        console.error('[DB] Error during initialization:', error);
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
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

    // Create a deep copy to avoid mutations
    const entryToAdd = {
      ...entry,
      fields: { ...entry.fields },
      created: new Date(entry.created),
      modified: new Date()
    };

    try {
      await this.db.logEntries.add(entryToAdd);
      console.log(`[DB] Successfully added entry with ID: ${entryToAdd.id}`);
      return entryToAdd;
    } catch (error) {
      console.error(`[DB] Error adding entry:`, error);
      throw error;
    }
  }

  public async updateEntry(entry: LogEntry): Promise<LogEntry> {
    await this.initialize();

    // Get the existing entry
    const existingEntry = await this.db.logEntries.get(entry.id);
    if (!existingEntry) {
      throw new Error(`Entry with ID ${entry.id} not found`);
    }

    // Create a deep copy with preserved fields
    const updatedEntry = {
      ...existingEntry,
      ...entry,
      fields: { ...existingEntry.fields, ...entry.fields },
      created: existingEntry.created,
      modified: new Date()
    };

    await this.db.logEntries.put(updatedEntry);
    return updatedEntry;
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
    const entries = await this.db.logEntries
      .where('drillhole_id')
      .equals(drillholeId)
      .sortBy('from'); 
    console.log(`[DB] Found ${entries.length} entries, sorted by depth`);
    console.log('[DB] Entries:', entries);
    return entries;
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
  }

  public async addBackup(backup: BackupEntry): Promise<string> {
    await this.initialize();
    return await this.db.backupEntries.add(backup);
  }

  public async logError(error: ErrorLog): Promise<string> {
    await this.initialize();
    return await this.db.errorLogs.add(error);
  }

  public async getFieldStyle(fieldName: string, value: any): Promise<any> {
    await this.initialize();
    return this.csvService.getFieldStyle(fieldName, value);
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

    } catch (error) {
      console.error('[DB] Error during unsplit operation:', error);
      throw error;
    }
  }
}

export default DatabaseService;
