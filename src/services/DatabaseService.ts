import Dexie from 'dexie';
import { LogEntry, BackupEntry, ErrorLog } from '../types';
import CSVService from './CSVService';

class QuickLoggerDB extends Dexie {
  logEntries!: Dexie.Table<LogEntry, string>;
  backups!: Dexie.Table<BackupEntry, string>;
  errorLogs!: Dexie.Table<ErrorLog, string>;

  constructor() {
    super('QuickLoggerDB');
    this.version(1).stores({
      logEntries: 'id,holeid,from,to,synced',
      backups: 'id,timestamp',
      errorLogs: 'id,timestamp'
    });

    this.version(2).stores({
      logEntries: 'id,drillhole_id,from,to,synced',
      backups: 'id,timestamp',
      errorLogs: 'id,timestamp'
    }).upgrade(tx => {
      return tx.logEntries.toCollection().modify(entry => {
        if (entry.holeid && !entry.drillhole_id) {
          entry.drillhole_id = entry.holeid;
          delete entry.holeid;
        }
      });
    });
  }
}

class DatabaseService {
  private static instance: DatabaseService;
  private db: QuickLoggerDB;
  private csvService: CSVService;
  private initialized: boolean = false;

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

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.csvService.loadConfiguration();
      const quicklogData = await this.csvService.loadQuicklog();
      
      // Check if database is empty
      const count = await this.db.logEntries.count();
      if (count === 0) {
        // Load initial data from CSV
        const entries = await this.csvService.loadQuicklog();
        if (entries && entries.length > 0) {
          await this.db.logEntries.bulkAdd(entries);
        }
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  public async addEntry(entry: LogEntry): Promise<string> {
    await this.initialize();
    const newEntry = {
      ...entry,
      id: entry.id || crypto.randomUUID(),
      created: entry.created || new Date(),
      modified: new Date(),
      synced: false
    };
    return await this.db.logEntries.add(newEntry);
  }

  public async updateEntry(entry: LogEntry): Promise<string> {
    await this.initialize();
    const updatedEntry = {
      ...entry,
      modified: new Date(),
      synced: false
    };
    await this.db.logEntries.put(updatedEntry);
    return entry.id!;
  }

  public async deleteEntry(id: string): Promise<void> {
    await this.initialize();
    await this.db.logEntries.delete(id);
  }

  public async getEntry(id: string): Promise<LogEntry | undefined> {
    await this.initialize();
    return await this.db.logEntries.get(id);
  }

  public async getAllEntries(): Promise<LogEntry[]> {
    await this.initialize();
    return await this.db.logEntries.toArray();
  }

  public async getEntriesByHole(drillholeId: string): Promise<LogEntry[]> {
    await this.initialize();
    return await this.db.logEntries
      .where('drillhole_id')
      .equals(drillholeId)
      .sortBy('from');
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

  public async addBackup(backup: BackupEntry): Promise<string> {
    await this.initialize();
    return await this.db.backups.add(backup);
  }

  public async logError(error: ErrorLog): Promise<string> {
    await this.initialize();
    return await this.db.errorLogs.add(error);
  }

  public async getFieldStyle(fieldName: string, value: any): Promise<any> {
    await this.initialize();
    return this.csvService.getFieldStyle(fieldName, value);
  }
}

export default DatabaseService;
