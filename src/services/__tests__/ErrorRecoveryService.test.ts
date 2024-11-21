import { ErrorRecoveryService } from '../ErrorRecoveryService';
import DatabaseService from '../DatabaseService';
import { LogEntry, ErrorLog } from '../../types';

jest.mock('../DatabaseService');

describe('ErrorRecoveryService', () => {
  let errorRecoveryService: ErrorRecoveryService;
  let mockDbService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getInstance to return a new instance for testing
    jest.spyOn(DatabaseService, 'getInstance').mockImplementation(() => {
      const instance = new (DatabaseService as any)();
      instance.initialized = true;
      return instance;
    });

    mockDbService = DatabaseService.getInstance() as jest.Mocked<DatabaseService>;
    errorRecoveryService = ErrorRecoveryService.getInstance();
  });

  describe('logError', () => {
    it('should log an error', async () => {
      const mockError: ErrorLog = {
        id: 'error-1',
        timestamp: new Date(),
        error: 'Test error',
        context: 'Test context',
        severity: 'error'
      };

      mockDbService.logError.mockResolvedValue('error-1');

      await errorRecoveryService.logError('SYNC_ERROR', 'Test error', { context: 'Test context' });

      expect(mockDbService.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          context: 'Test context',
          severity: 'error'
        })
      );
    });
  });

  describe('backup', () => {
    it('should create a backup', async () => {
      const mockEntry: LogEntry = {
        id: '1',
        drillhole_id: 'H1',
        from: 0,
        to: 1,
        lithology: 'SAND',
        mineralized: false,
        created: new Date(),
        modified: new Date(),
        synced: false
      };

      mockDbService.getAllEntries.mockResolvedValue([mockEntry]);
      mockDbService.addBackup.mockResolvedValue('backup-1');

      const backupId = await errorRecoveryService.createBackup();

      expect(backupId).toBe('backup-1');
      expect(mockDbService.getAllEntries).toHaveBeenCalled();
      expect(mockDbService.addBackup).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'full',
          data: expect.any(String)
        })
      );
    });
  });

  describe('restore', () => {
    it('should restore from a backup', async () => {
      const mockEntry: LogEntry = {
        id: '1',
        drillhole_id: 'H1',
        from: 0,
        to: 1,
        lithology: 'SAND',
        mineralized: false,
        created: new Date(),
        modified: new Date(),
        synced: false
      };

      const mockBackup = {
        id: 'backup-1',
        timestamp: new Date(),
        data: JSON.stringify([mockEntry]),
        type: 'full' as const
      };

      mockDbService.getBackupById.mockResolvedValue(mockBackup);
      mockDbService.clearAllEntries.mockResolvedValue();
      mockDbService.addEntry.mockResolvedValue('entry-1');

      await errorRecoveryService.restoreFromBackup('backup-1');

      expect(mockDbService.getBackupById).toHaveBeenCalledWith('backup-1');
      expect(mockDbService.clearAllEntries).toHaveBeenCalled();
      expect(mockDbService.addEntry).toHaveBeenCalledTimes(1);
    });

    it('should throw error if backup not found', async () => {
      mockDbService.getBackupById.mockResolvedValue(null);

      await expect(errorRecoveryService.restoreFromBackup('non-existent'))
        .rejects.toThrow('Backup not found');
    });
  });
});
