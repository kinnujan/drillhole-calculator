import Dexie from 'dexie';
import { LogEntry, BackupEntry, ErrorLog } from '../types';
import { v4 as uuidv4 } from 'uuid';

class AppDatabase extends Dexie {
  logEntries!: Dexie.Table<LogEntry, string>;
  backups!: Dexie.Table<BackupEntry, string>;
  errorLogs!: Dexie.Table<ErrorLog, string>;

  constructor() {
    super('QuickLoggerDB');
    this.version(1).stores({
      logEntries: 'id,holeid,synced',
      backups: 'id,timestamp',
      errorLogs: 'id,timestamp',
    });
  }
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: AppDatabase;

  private constructor() {
    this.db = new AppDatabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async addEntry(entry: LogEntry): Promise<string> {
    try {
      if (!entry.id) {
        entry.id = uuidv4();
      }
      if (!entry.created) {
        entry.created = new Date();
      }
      entry.modified = new Date();
      entry.synced = false;

      await this.db.logEntries.add(entry);
      return entry.id;
    } catch (error) {
      console.error('Error adding entry:', error);
      throw error;
    }
  }

  async getEntry(id: string): Promise<LogEntry | null> {
    try {
      const entry = await this.db.logEntries.get(id);
      return entry || null;
    } catch (error) {
      console.error('Error getting entry:', error);
      throw error;
    }
  }

  async updateEntry(entry: LogEntry): Promise<void> {
    try {
      entry.modified = new Date();
      await this.db.logEntries.put(entry);
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      await this.db.logEntries.delete(id);
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }

  async getAllEntries(): Promise<LogEntry[]> {
    try {
      return await this.db.logEntries.toArray();
    } catch (error) {
      console.error('Error getting all entries:', error);
      throw error;
    }
  }

  async getUnsynced(): Promise<LogEntry[]> {
    try {
      return await this.db.logEntries
        .where('synced')
        .equals(0)
        .toArray();
    } catch (error) {
      console.error('Error getting unsynced entries:', error);
      throw error;
    }
  }

  async markAsSynced(id: string): Promise<void> {
    try {
      await this.db.logEntries
        .where('id')
        .equals(id)
        .modify({ synced: true });
    } catch (error) {
      console.error('Error marking entry as synced:', error);
      throw error;
    }
  }

  async createBackup(backup: BackupEntry): Promise<string> {
    try {
      if (!backup.id) {
        backup.id = uuidv4();
      }
      await this.db.backups.add(backup);
      return backup.id;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async getBackup(id: string): Promise<BackupEntry | null> {
    try {
      const backup = await this.db.backups.get(id);
      return backup || null;
    } catch (error) {
      console.error('Error getting backup:', error);
      throw error;
    }
  }

  async getBackups(): Promise<BackupEntry[]> {
    try {
      return await this.db.backups.toArray();
    } catch (error) {
      console.error('Error getting backups:', error);
      throw error;
    }
  }

  async clearEntries(): Promise<void> {
    try {
      await this.db.logEntries.clear();
    } catch (error) {
      console.error('Error clearing entries:', error);
      throw error;
    }
  }

  async createErrorLog(errorLog: ErrorLog): Promise<string> {
    try {
      if (!errorLog.id) {
        errorLog.id = uuidv4();
      }
      await this.db.errorLogs.add(errorLog);
      return errorLog.id;
    } catch (error) {
      console.error('Error creating error log:', error);
      throw error;
    }
  }

  async getErrorLogs(): Promise<ErrorLog[]> {
    try {
      return await this.db.errorLogs.toArray();
    } catch (error) {
      console.error('Error getting error logs:', error);
      throw error;
    }
  }

  async exportToCsv(): Promise<string> {
    try {
      const entries = await this.getAllEntries();
      const csvRows = entries.map(entry => {
        const basicFields = [
          entry.id,
          entry.holeid,
          entry.from,
          entry.to,
          entry.created.toISOString(),
          entry.modified.toISOString(),
          entry.synced
        ];
        const customFields = Object.entries(entry.fields)
          .map(([_, value]) => value)
          .join(',');
        return [...basicFields, customFields].join(',');
      });

      const headers = ['ID', 'HoleID', 'From', 'To', 'Created', 'Modified', 'Synced', 'Custom Fields'].join(',');
      return [headers, ...csvRows].join('\n');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  async importFromCsv(csvContent: string): Promise<void> {
    try {
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      const entries = lines.slice(1).map(line => {
        const values = line.split(',');
        const entry: LogEntry = {
          id: values[0],
          holeid: values[1],
          from: parseFloat(values[2]),
          to: parseFloat(values[3]),
          created: new Date(values[4]),
          modified: new Date(values[5]),
          synced: values[6] === 'true',
          fields: {},
        };
        // Parse custom fields
        const customFields = values.slice(7);
        customFields.forEach((value, index) => {
          entry.fields[`field${index + 1}`] = value;
        });
        return entry;
      });

      await this.db.logEntries.bulkAdd(entries);
    } catch (error) {
      console.error('Error importing from CSV:', error);
      throw error;
    }
  }
}
