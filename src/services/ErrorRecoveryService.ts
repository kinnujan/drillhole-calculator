import { LogEntry } from '../types/LogEntry';
import databaseService from './DatabaseService';
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

class ErrorRecoveryService {
  private readonly MAX_ERROR_LOGS = 1000;
  private readonly MAX_BACKUPS = 100;
  private dbService = databaseService;

  constructor() {
    console.log('ErrorRecoveryService initialized');
  }

  async createBackup(): Promise<void> {
    try {
      const entries = await this.dbService.getLatestEntries();
      const backup: BackupEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        entries
      };
      await this.dbService.saveBackup(backup);

      // Cleanup old backups
      const backups = await this.dbService.getBackups();
      if (backups.length > this.MAX_BACKUPS) {
        const toDelete = backups
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(this.MAX_BACKUPS);
        for (const backup of toDelete) {
          await this.dbService.deleteBackup(backup.id);
        }
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async logError(type: string, message: string, data?: any): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type,
        message,
        data
      };
      await this.dbService.saveErrorLog(errorLog);

      // Cleanup old error logs
      const errorLogs = await this.dbService.getErrorLogs();
      if (errorLogs.length > this.MAX_ERROR_LOGS) {
        const toDelete = errorLogs
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(this.MAX_ERROR_LOGS);
        for (const log of toDelete) {
          await this.dbService.deleteErrorLog(log.id);
        }
      }
    } catch (error) {
      console.error('Error logging error:', error);
      // Don't throw here to avoid recursive error logging
    }
  }

  async getLatestBackup(): Promise<BackupEntry | null> {
    try {
      const backups = await this.dbService.getBackups();
      if (backups.length === 0) return null;

      return backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
    } catch (error) {
      console.error('Error getting latest backup:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    try {
      const backup = await this.dbService.getBackup(backupId);
      if (!backup) throw new Error('Backup not found');

      // Create a new backup before restoration
      await this.createBackup();

      // Restore entries from backup
      for (const entry of backup.entries) {
        await this.dbService.saveEntry(entry);
      }
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  async getErrorLogs(): Promise<ErrorLog[]> {
    try {
      return await this.dbService.getErrorLogs();
    } catch (error) {
      console.error('Error getting error logs:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const errorRecoveryService = new ErrorRecoveryService();
export default errorRecoveryService;
