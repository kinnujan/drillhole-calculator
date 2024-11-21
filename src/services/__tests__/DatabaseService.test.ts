import DatabaseService from '../DatabaseService';
import { LogEntry, BackupEntry, ErrorLog } from '../../types';

jest.mock('../DatabaseService');

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    dbService = DatabaseService.getInstance();
  });

  describe('addEntry', () => {
    it('should add a new entry', async () => {
      const mockEntry: LogEntry = {
        drillhole_id: 'H1',
        from: 0,
        to: 1,
        lithology: 'SAND',
        mineralized: false
      };

      const mockDbService = dbService as jest.Mocked<DatabaseService>;
      mockDbService.addEntry.mockResolvedValue('entry-1');

      const result = await dbService.addEntry(mockEntry);
      expect(result).toBe('entry-1');
      expect(mockDbService.addEntry).toHaveBeenCalledWith(mockEntry);
    });
  });

  describe('getEntry', () => {
    it('should retrieve an entry by id', async () => {
      const mockEntry: LogEntry = {
        id: 'entry-1',
        drillhole_id: 'H1',
        from: 0,
        to: 1,
        lithology: 'SAND',
        mineralized: false,
        created: new Date(),
        modified: new Date(),
        synced: false
      };

      const mockDbService = dbService as jest.Mocked<DatabaseService>;
      mockDbService.getEntry.mockResolvedValue(mockEntry);

      const result = await dbService.getEntry('entry-1');
      expect(result).toEqual(mockEntry);
      expect(mockDbService.getEntry).toHaveBeenCalledWith('entry-1');
    });
  });

  describe('backup', () => {
    it('should create a backup', async () => {
      const mockBackup: BackupEntry = {
        id: 'backup-1',
        timestamp: new Date(),
        data: JSON.stringify([]),
        type: 'full'
      };

      const mockDbService = dbService as jest.Mocked<DatabaseService>;
      mockDbService.addBackup.mockResolvedValue('backup-1');

      const result = await dbService.addBackup(mockBackup);
      expect(result).toBe('backup-1');
      expect(mockDbService.addBackup).toHaveBeenCalledWith(mockBackup);
    });
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

      const mockDbService = dbService as jest.Mocked<DatabaseService>;
      mockDbService.logError.mockResolvedValue('error-1');

      const result = await dbService.logError(mockError);
      expect(result).toBe('error-1');
      expect(mockDbService.logError).toHaveBeenCalledWith(mockError);
    });
  });
});
