import { ErrorRecoveryService } from '../ErrorRecoveryService';
import { DatabaseService } from '../DatabaseService';
import { LogEntry, BackupEntry, ErrorLog } from '../../types';

jest.mock('../DatabaseService');

describe('ErrorRecoveryService', () => {
  let errorRecoveryService: ErrorRecoveryService;
  let mockDbService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbService = {
      getInstance: jest.fn(),
      createBackup: jest.fn(),
      getBackup: jest.fn(),
      clearEntries: jest.fn(),
      addEntry: jest.fn(),
      createErrorLog: jest.fn(),
      getBackups: jest.fn(),
      getAllEntries: jest.fn(),
    } as unknown as jest.Mocked<DatabaseService>;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDbService);
    errorRecoveryService = ErrorRecoveryService.getInstance();
  });

  describe('createBackup', () => {
    it('should create a backup successfully', async () => {
      const mockEntries: LogEntry[] = [
        {
          id: '1',
          holeid: 'H1',
          synced: false,
          fields: {},
          created: new Date(),
          modified: new Date(),
          from: 0,
          to: 10
        }
      ];

      mockDbService.getAllEntries.mockResolvedValue(mockEntries);
      mockDbService.createBackup.mockResolvedValue('backup-id');

      const backupId = await errorRecoveryService.createBackup();

      expect(backupId).toBe('backup-id');
      expect(mockDbService.createBackup).toHaveBeenCalledWith(expect.objectContaining({
        entries: mockEntries,
        timestamp: expect.any(String),
      }));
    });

    it('should handle backup creation failure', async () => {
      mockDbService.getAllEntries.mockRejectedValue(new Error('Database error'));

      await expect(errorRecoveryService.createBackup()).rejects.toThrow('Database error');
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore from backup successfully', async () => {
      const mockBackup: BackupEntry = {
        id: 'backup-1',
        timestamp: new Date().toISOString(),
        entries: [
          {
            id: '1',
            holeid: 'H1',
            synced: false,
            fields: {},
            created: new Date(),
            modified: new Date(),
            from: 0,
            to: 10
          }
        ]
      };

      mockDbService.getBackup.mockResolvedValue(mockBackup);

      await errorRecoveryService.restoreFromBackup('backup-1');

      expect(mockDbService.clearEntries).toHaveBeenCalled();
      expect(mockDbService.addEntry).toHaveBeenCalledWith(mockBackup.entries[0]);
    });

    it('should handle backup not found', async () => {
      mockDbService.getBackup.mockResolvedValue(null);

      await expect(errorRecoveryService.restoreFromBackup('non-existent')).rejects.toThrow('Backup not found');
    });
  });

  describe('logError', () => {
    it('should log error successfully', async () => {
      mockDbService.createErrorLog.mockResolvedValue('error-1');

      const errorId = await errorRecoveryService.logError('Test error', 'Error details');

      expect(errorId).toBe('error-1');
      expect(mockDbService.createErrorLog).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Test error',
        details: 'Error details',
        timestamp: expect.any(String),
      }));
    });

    it('should handle error logging failure', async () => {
      mockDbService.createErrorLog.mockRejectedValue(new Error('Database error'));

      await expect(errorRecoveryService.logError('Test error', 'Error details')).rejects.toThrow('Database error');
    });
  });
});
