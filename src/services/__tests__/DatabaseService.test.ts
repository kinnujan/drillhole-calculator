import { DatabaseService } from '../DatabaseService';
import Dexie from 'dexie';
import { LogEntry, BackupEntry, ErrorLog } from '../../types';

// Mock Dexie
jest.mock('dexie');

describe('DatabaseService', () => {
  let dbService: DatabaseService;
  let mockTable: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock table
    mockTable = {
      add: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      where: jest.fn(),
      toArray: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    // Setup mock Dexie instance
    (Dexie as jest.Mock).mockImplementation(() => ({
      version: jest.fn().mockReturnThis(),
      stores: jest.fn().mockReturnThis(),
      table: jest.fn().mockReturnValue(mockTable),
      open: jest.fn(),
      close: jest.fn(),
    }));

    dbService = DatabaseService.getInstance();
  });

  describe('addEntry', () => {
    it('should add a new log entry successfully', async () => {
      const mockEntry: LogEntry = {
        id: '1',
        holeid: 'H1',
        fields: {},
        created: new Date(),
        modified: new Date(),
        synced: false,
        from: 0,
        to: 10
      };

      mockTable.add.mockResolvedValue('1');

      const result = await dbService.addEntry(mockEntry);

      expect(result).toBe('1');
      expect(mockTable.add).toHaveBeenCalledWith(mockEntry);
    });

    it('should handle add entry failure', async () => {
      const mockEntry: LogEntry = {
        id: '1',
        holeid: 'H1',
        fields: {},
        created: new Date(),
        modified: new Date(),
        synced: false,
        from: 0,
        to: 10
      };

      mockTable.add.mockRejectedValue(new Error('Database error'));

      await expect(dbService.addEntry(mockEntry)).rejects.toThrow('Database error');
    });
  });

  describe('getUnsynced', () => {
    it('should return unsynced entries', async () => {
      const mockEntries: LogEntry[] = [{
        id: '1',
        holeid: 'H1',
        fields: {},
        created: new Date(),
        modified: new Date(),
        synced: false,
        from: 0,
        to: 10
      }];

      mockTable.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockEntries)
        })
      });

      const result = await dbService.getUnsynced();

      expect(result).toEqual(mockEntries);
      expect(mockTable.where).toHaveBeenCalledWith('synced');
    });
  });

  describe('createBackup', () => {
    it('should create a backup successfully', async () => {
      const mockBackup: BackupEntry = {
        id: 'backup-1',
        timestamp: new Date().toISOString(),
        entries: [{
          id: '1',
          holeid: 'H1',
          fields: {},
          created: new Date(),
          modified: new Date(),
          synced: false,
          from: 0,
          to: 10
        }]
      };

      mockTable.add.mockResolvedValue('backup-1');

      const result = await dbService.createBackup(mockBackup);

      expect(result).toBe('backup-1');
      expect(mockTable.add).toHaveBeenCalledWith(mockBackup);
    });
  });

  describe('createErrorLog', () => {
    it('should create an error log successfully', async () => {
      const mockErrorLog: ErrorLog = {
        id: 'error-1',
        message: 'Test error',
        details: 'Error details',
        timestamp: new Date().toISOString()
      };

      mockTable.add.mockResolvedValue('error-1');

      const result = await dbService.createErrorLog(mockErrorLog);

      expect(result).toBe('error-1');
      expect(mockTable.add).toHaveBeenCalledWith(mockErrorLog);
    });
  });

  describe('markAsSynced', () => {
    it('should mark entry as synced successfully', async () => {
      mockTable.update.mockResolvedValue(1);

      await dbService.markAsSynced('1');

      expect(mockTable.update).toHaveBeenCalledWith('1', { synced: true });
    });
  });
});
