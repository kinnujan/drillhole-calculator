import { LogEntry } from '../models/LogEntry';
import DatabaseService from './DatabaseService';
import { v4 as uuidv4 } from 'uuid';

interface ErrorLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  data?: any;
}

interface BackupEntry {
  id: string;
  timestamp: string;
  entries: LogEntry[];
}

export class ErrorRecoveryService {
  private static instance: ErrorRecoveryService;
  private readonly MAX_ERROR_LOGS = 1000;
  private readonly MAX_BACKUPS = 10;
  private readonly BACKUP_INTERVAL = 1000 * 60 * 60; // 1 hour

  private errorLogs: ErrorLog[] = [];
  private backups: BackupEntry[] = [];
  private lastBackupTime: Date | null = null;
  private backupTimeout: NodeJS.Timeout | null = null;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.initializeBackupSchedule();
  }

  static getInstance(): ErrorRecoveryService {
    if (!ErrorRecoveryService.instance) {
      ErrorRecoveryService.instance = new ErrorRecoveryService();
    }
    return ErrorRecoveryService.instance;
  }

  private async initializeBackupSchedule() {
    // Load existing backups from IndexedDB
    await this.loadBackups();
    
    // Schedule regular backups
    this.scheduleNextBackup();
  }

  private scheduleNextBackup() {
    if (this.backupTimeout) {
      clearTimeout(this.backupTimeout);
    }

    const now = new Date();
    const nextBackupTime = this.lastBackupTime
      ? new Date(this.lastBackupTime.getTime() + this.BACKUP_INTERVAL)
      : now;

    const delay = Math.max(0, nextBackupTime.getTime() - now.getTime());

    this.backupTimeout = setTimeout(() => this.createBackup(), delay);
  }

  async logError(type: string, message: string, data?: any): Promise<string> {
    const errorLog: ErrorLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    };

    this.errorLogs.push(errorLog);

    // Keep only the most recent logs
    if (this.errorLogs.length > this.MAX_ERROR_LOGS) {
      this.errorLogs = this.errorLogs.slice(-this.MAX_ERROR_LOGS);
    }

    // Store error log in IndexedDB
    try {
      return await this.dbService.createErrorLog(errorLog);
    } catch (error) {
      console.error('Failed to store error log:', error);
      throw error;
    }
  }

  async createBackup(): Promise<string> {
    try {
      const entries = await this.dbService.getAllEntries();
      const backup: BackupEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        entries,
      };

      this.backups.push(backup);

      // Keep only the most recent backups
      if (this.backups.length > this.MAX_BACKUPS) {
        this.backups = this.backups.slice(-this.MAX_BACKUPS);
      }

      this.lastBackupTime = new Date(backup.timestamp);

      // Store backup in IndexedDB
      return await this.dbService.createBackup(backup);
    } catch (error) {
      console.error('Failed to create backup:', error);
      this.logError('BACKUP_FAILED', 'Failed to create backup', error);
      throw error;
    }
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    try {
      const backup = await this.dbService.getBackup(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Create a backup before restoration
      await this.createBackup();

      // Clear current entries
      await this.dbService.clearEntries();

      // Restore entries from backup
      for (const entry of backup.entries) {
        await this.dbService.addEntry(entry);
      }

      this.logError('BACKUP_RESTORED', `Restored from backup: ${backupId}`);
    } catch (error) {
      this.logError('RESTORE_FAILED', 'Failed to restore from backup', error);
      throw error;
    }
  }

  async getErrorLogs(startTime?: Date, endTime?: Date): Promise<ErrorLog[]> {
    let logs = this.errorLogs;

    if (startTime) {
      logs = logs.filter(log => new Date(log.timestamp) >= startTime);
    }

    if (endTime) {
      logs = logs.filter(log => new Date(log.timestamp) <= endTime);
    }

    return logs;
  }

  async getBackups(): Promise<BackupEntry[]> {
    return this.backups;
  }

  private async loadBackups() {
    try {
      const backups = await this.dbService.getBackups();
      this.backups = backups;
      
      if (this.backups.length > 0) {
        this.lastBackupTime = new Date(this.backups[this.backups.length - 1].timestamp);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
      this.logError('LOAD_BACKUPS_FAILED', 'Failed to load backups', error);
    }
  }
}
