import { SyncService } from '../SyncService';
import { DatabaseService } from '../DatabaseService';
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

    mockDbService = {
      getInstance: jest.fn(),
      getUnsynced: jest.fn(),
      markAsSynced: jest.fn(),
      addEntry: jest.fn(),
      updateEntry: jest.fn(),
    } as unknown as jest.Mocked<DatabaseService>;

    mockDropboxService = {
      getInstance: jest.fn(),
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      getFiles: jest.fn(),
      uploadEntry: jest.fn(),
      getChanges: jest.fn(),
    } as unknown as jest.Mocked<DropboxService>;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDbService);
    (DropboxService.getInstance as jest.Mock).mockReturnValue(mockDropboxService);

    syncService = SyncService.getInstance();
  });

  describe('sync', () => {
    it('should sync unsynced entries successfully', async () => {
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

      mockDbService.getUnsynced.mockResolvedValue([mockEntry]);
      mockDropboxService.uploadEntry.mockResolvedValue();

      await syncService.sync();

      expect(mockDropboxService.uploadEntry).toHaveBeenCalledWith(mockEntry);
      expect(mockDbService.markAsSynced).toHaveBeenCalledWith(mockEntry.id);
    });

    it('should handle sync failure', async () => {
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

      const error = new Error('Upload failed');
      mockDbService.getUnsynced.mockResolvedValue([mockEntry]);
      mockDropboxService.uploadEntry.mockRejectedValue(error);

      await expect(syncService.sync()).rejects.toThrow('Upload failed');
    });
  });

  describe('pullChanges', () => {
    it('should sync from remote successfully', async () => {
      const mockEntry: LogEntry = {
        id: '1',
        holeid: 'H1',
        fields: {},
        created: new Date(),
        modified: new Date(),
        synced: true,
        from: 0,
        to: 10
      };

      mockDropboxService.getChanges.mockResolvedValue([mockEntry]);

      await syncService.pullChanges();

      expect(mockDropboxService.getChanges).toHaveBeenCalled();
      expect(mockDbService.addEntry).toHaveBeenCalledWith(mockEntry);
    });

    it('should handle remote sync failure', async () => {
      const error = new Error('Download failed');
      mockDropboxService.getChanges.mockRejectedValue(error);

      await expect(syncService.pullChanges()).rejects.toThrow('Download failed');
    });
  });
});
