import { SyncService } from '../SyncService';
import DatabaseService from '../DatabaseService';
import DropboxService from '../DropboxService';
import { LogEntry } from '../../types';

jest.mock('../DatabaseService');
jest.mock('../DropboxService');

describe('SyncService', () => {
  let syncService: SyncService;
  let mockDbService: jest.Mocked<DatabaseService>;
  let mockDropboxService: jest.Mocked<DropboxService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getInstance to return a new instance for testing
    jest.spyOn(DatabaseService, 'getInstance').mockImplementation(() => {
      const instance = new (DatabaseService as any)();
      instance.initialized = true;
      return instance;
    });

    jest.spyOn(DropboxService, 'getInstance').mockImplementation(() => {
      return new (DropboxService as any)();
    });

    mockDbService = DatabaseService.getInstance() as jest.Mocked<DatabaseService>;
    mockDropboxService = DropboxService.getInstance() as jest.Mocked<DropboxService>;

    syncService = SyncService.getInstance();
  });

  describe('sync', () => {
    it('should sync entries successfully', async () => {
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

      mockDbService.getUnsyncedEntries.mockResolvedValue([mockEntry]);
      mockDropboxService.sync.mockResolvedValue();

      await syncService.sync();

      expect(mockDbService.getUnsyncedEntries).toHaveBeenCalled();
      expect(mockDropboxService.sync).toHaveBeenCalledWith([mockEntry]);
    });

    it('should handle sync failure', async () => {
      const error = new Error('Sync failed');
      mockDropboxService.sync.mockRejectedValue(error);

      await expect(syncService.sync()).rejects.toThrow('Sync failed');
    });
  });

  describe('backup', () => {
    it('should create backup successfully', async () => {
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

      await syncService.startBackgroundSync();

      expect(mockDbService.getAllEntries).toHaveBeenCalled();
      expect(mockDbService.addBackup).toHaveBeenCalled();
    });
  });
});
