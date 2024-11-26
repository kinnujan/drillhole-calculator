// Mock DropboxService for development
export interface SyncStatus {
  lastSync: Date | null;
  isSyncing: boolean;
  error: string | null;
  pendingChanges: number;
}

export interface FileMetadata {
  rev: string;
  path: string;
  serverModified: Date;
  size: number;
}

export class DropboxService {
  private syncStatus: SyncStatus = {
    lastSync: null,
    isSyncing: false,
    error: null,
    pendingChanges: 0
  };

  constructor() {
    console.log('Mock DropboxService initialized');
  }

  async uploadFile(path: string, contents: string): Promise<void> {
    console.log('Mock upload file:', { path, contentLength: contents.length });
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async downloadFile(path: string): Promise<string | null> {
    console.log('Mock download file:', { path });
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return null;
  }

  async getFileMetadata(path: string): Promise<FileMetadata | null> {
    console.log('Mock get file metadata:', { path });
    return null;
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  isAuthenticated(): boolean {
    return true; // Mock always authenticated
  }
}

// Create and export singleton instance
const dropboxService = new DropboxService();
export default dropboxService;