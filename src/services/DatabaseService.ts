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
    return await this.db.logEntries.add(entry);
  }

  public async getEntry(id: string): Promise<LogEntry | undefined> {
    return await this.db.logEntries.get(id);
  }

  public async updateEntry(entry: LogEntry): Promise<number> {
    return await this.db.logEntries.update(entry.id, entry);
  }

  public async deleteEntry(id: string): Promise<void> {
    await this.db.logEntries.delete(id);
  }

  public async getAllEntries(): Promise<LogEntry[]> {
    return await this.db.logEntries.toArray();
  }

  public async getUnsynced(): Promise<LogEntry[]> {
    return await this.db.logEntries.where('synced').equals(false).toArray();
  }

  public async markAsSynced(id: string): Promise<number> {
    return await this.db.logEntries.update(id, { synced: true });
  }

  public async createBackup(backup: BackupEntry): Promise<string> {
    return await this.db.backups.add(backup);
  }

  public async getBackup(id: string): Promise<BackupEntry | undefined> {
    return await this.db.backups.get(id);
  }

  public async createErrorLog(errorLog: ErrorLog): Promise<string> {
    return await this.db.errorLogs.add(errorLog);
  }

  public async getFieldStyle(fieldName: string, value: any): Promise<any> {
    return this.csvService.getFieldStyle(fieldName, value);
  }
}

export default DatabaseService;
