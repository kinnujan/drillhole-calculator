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
  metadata?: {
    totalEntries: number;
    createdAt: string;
  };
}

class ErrorRecoveryService {
  private readonly MAX_ERROR_LOGS = 1000;
  private readonly MAX_BACKUPS = 100;
  private readonly CLEANUP_INTERVAL = 1000 * 60 * 60; // 1 hour
  private dbService: typeof databaseService;

  constructor(dbService: typeof databaseService) {
    this.dbService = dbService;
    // Start periodic cleanup
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    console.log('ErrorRecoveryService initialized');
  }

  private async cleanup(): Promise<void> {
    try {
      console.log('[ErrorRecovery] Starting cleanup...');
      
      // Cleanup error logs
      const errorLogs = await this.dbService.getErrorLogs();
      if (errorLogs.length > this.MAX_ERROR_LOGS) {
        const toDelete = errorLogs
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(this.MAX_ERROR_LOGS);
        
        console.log(`[ErrorRecovery] Cleaning up ${toDelete.length} old error logs`);
        for (const log of toDelete) {
          await this.dbService.deleteErrorLog(log.id);
        }
      }

      // Cleanup backups
      const backups = await this.dbService.getBackups();
      if (backups.length > this.MAX_BACKUPS) {
        const toDelete = backups
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(this.MAX_BACKUPS);
        
        console.log(`[ErrorRecovery] Cleaning up ${toDelete.length} old backups`);
        for (const backup of toDelete) {
          await this.dbService.deleteBackup(backup.id);
        }
      }

      console.log('[ErrorRecovery] Cleanup completed');
    } catch (error) {
      console.error('[ErrorRecovery] Error during cleanup:', error);
      // Don't throw here to avoid crashing the cleanup interval
    }
  }

  async logError(type: string, message: string, data?: any): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type,
        message,
        data: data ? JSON.stringify(data) : undefined
      };
      
      console.log('[ErrorRecovery] Logging error:', errorLog);
      await this.dbService.saveErrorLog(errorLog);

      // If we have too many errors, trigger an immediate cleanup
      const errorLogs = await this.dbService.getErrorLogs();
      if (errorLogs.length > this.MAX_ERROR_LOGS) {
        await this.cleanup();
      }
    } catch (error) {
      console.error('[ErrorRecovery] Error logging error:', error);
      // Don't throw here to avoid recursive error logging
    }
  }

  async createBackup(): Promise<void> {
    try {
      console.log('[ErrorRecovery] Creating backup...');
      const entries = await this.dbService.getLatestEntries();
      
      const backup: BackupEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        entries,
        metadata: {
          totalEntries: entries.length,
          createdAt: new Date().toISOString()
        }
      };

      console.log('[ErrorRecovery] Saving backup:', backup.id);
      await this.dbService.saveBackup(backup);

      // If we have too many backups, trigger cleanup
      const backups = await this.dbService.getBackups();
      if (backups.length > this.MAX_BACKUPS) {
        await this.cleanup();
      }

      console.log('[ErrorRecovery] Backup created successfully');
    } catch (error) {
      console.error('[ErrorRecovery] Error creating backup:', error);
      await this.logError('BACKUP_CREATION_FAILED', 'Failed to create backup', error);
      throw error;
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
const errorRecoveryService = new ErrorRecoveryService(databaseService);
export default errorRecoveryService;
