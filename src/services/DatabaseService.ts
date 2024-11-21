import Dexie from 'dexie';
import { LogEntry, BackupEntry, ErrorLog } from '../types';
import CSVService from './CSVService';

class QuickLoggerDB extends Dexie {
  logEntries!: Dexie.Table<LogEntry, string>;
  backups!: Dexie.Table<BackupEntry, string>;
  errorLogs!: Dexie.Table<ErrorLog, string>;

  constructor() {
    super('QuickLoggerDB');
    this.version(2).stores({
      logEntries: 'id,drillhole_id,from,to,synced',
      backups: 'id,timestamp',
      errorLogs: 'id,timestamp'
    });

    this.version(1).stores({
      logEntries: 'id,holeid,from,to,synced',
      backups: 'id,timestamp',
      errorLogs: 'id,timestamp'
    });
  }
}

class DatabaseService {
  private static instance: DatabaseService;
  private db: QuickLoggerDB;
  private csvService: CSVService;

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
    try {
      await this.csvService.loadConfiguration();
      await this.csvService.loadQuicklog();
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  public async addEntry(entry: LogEntry): Promise<string> {
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
    const updatedEntry = {
      ...entry,
      modified: new Date(),
      synced: false
    };
    await this.db.logEntries.put(updatedEntry);
    return entry.id!;
  }

  public async deleteEntry(id: string): Promise<void> {
    await this.db.logEntries.delete(id);
  }

  public async getEntry(id: string): Promise<LogEntry | undefined> {
    return await this.db.logEntries.get(id);
  }

  public async getAllEntries(): Promise<LogEntry[]> {
    return await this.db.logEntries.toArray();
  }

  public async getEntriesByHole(drillholeId: string): Promise<LogEntry[]> {
    return await this.db.logEntries
      .where('drillhole_id')
      .equals(drillholeId)
      .sortBy('from');
  }

  public async getUnsyncedEntries(): Promise<LogEntry[]> {
    return await this.db.logEntries
      .where('synced')
      .equals(false)
      .toArray();
  }

  public async markAsSynced(id: string): Promise<void> {
    await this.db.logEntries.update(id, { synced: true });
  }

  public async addBackup(backup: BackupEntry): Promise<string> {
    return await this.db.backups.add(backup);
  }

  public async logError(error: ErrorLog): Promise<string> {
    return await this.db.errorLogs.add(error);
  }

  public async getFieldStyle(fieldName: string, value: any): Promise<any> {
    return this.csvService.getFieldStyle(fieldName, value);
  }
}

export default DatabaseService;
