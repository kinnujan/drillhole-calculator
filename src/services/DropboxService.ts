import { Dropbox, DropboxResponse, files } from 'dropbox';

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

class DropboxService {
  private dropbox: Dropbox | null = null;
  private static instance: DropboxService;
  private syncStatus: SyncStatus = {
    lastSync: null,
    isSyncing: false,
    error: null,
    pendingChanges: 0
  };
  private pendingUploads: Map<string, { content: string; timestamp: Date }> = new Map();

  private constructor() {
    const accessToken = localStorage.getItem('dropbox_access_token');
    if (accessToken) {
      this.initializeDropbox(accessToken);
    }
  }

  static getInstance(): DropboxService {
    if (!DropboxService.instance) {
      DropboxService.instance = new DropboxService();
    }
    return DropboxService.instance;
  }

  private initializeDropbox(accessToken: string) {
    this.dropbox = new Dropbox({ accessToken });
  }

  async authenticate(): Promise<void> {
    const APP_KEY = import.meta.env.VITE_DROPBOX_APP_KEY;
    if (!APP_KEY) {
      throw new Error('Dropbox APP_KEY not found in environment variables');
    }

    const redirectUri = `${window.location.origin}/auth`;
    const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${APP_KEY}&response_type=token&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
  }

  handleAuthCallback(): boolean {
    const hash = window.location.hash;
    if (hash) {
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
      if (accessToken) {
        localStorage.setItem('dropbox_access_token', accessToken);
        this.initializeDropbox(accessToken);
        return true;
      }
    }
    return false;
  }

  isAuthenticated(): boolean {
    return this.dropbox !== null;
  }

  async uploadFile(path: string, contents: string, rev?: string): Promise<void> {
    if (!this.dropbox) {
      this.pendingUploads.set(path, { content: contents, timestamp: new Date() });
      this.syncStatus.pendingChanges = this.pendingUploads.size;
      throw new Error('Not authenticated with Dropbox');
    }

    try {
      this.syncStatus.isSyncing = true;
      this.syncStatus.error = null;

      const mode = rev 
        ? { '.tag': 'update', update: rev } as files.WriteMode
        : { '.tag': 'overwrite' } as files.WriteMode;

      const response = await this.dropbox.filesUpload({
        path: `/${path}`,
        contents,
        mode,
        autorename: true,
        strict_conflict: true
      });

      this.pendingUploads.delete(path);
      this.syncStatus.pendingChanges = this.pendingUploads.size;
      this.syncStatus.lastSync = new Date();
    } catch (error: any) {
      if (error?.status === 409) {
        // Conflict detected, get the server version and resolve
        const serverContent = await this.downloadFile(path);
        const resolvedContent = await this.resolveConflict(path, contents, serverContent);
        if (resolvedContent !== contents) {
          await this.uploadFile(path, resolvedContent);
        }
      } else {
        this.syncStatus.error = error instanceof Error ? error.message : 'Unknown error during upload';
        throw error;
      }
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  async downloadFile(path: string): Promise<string> {
    if (!this.dropbox) {
      throw new Error('Not authenticated with Dropbox');
    }

    try {
      this.syncStatus.isSyncing = true;
      this.syncStatus.error = null;

      const response = await this.dropbox.filesDownload({ path: `/${path}` });
      const file = response.result as any;
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file.fileBlob);
      });

      this.syncStatus.lastSync = new Date();
      return fileContent;
    } catch (error) {
      this.syncStatus.error = error instanceof Error ? error.message : 'Unknown error during download';
      throw error;
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  async getFileMetadata(path: string): Promise<FileMetadata> {
    if (!this.dropbox) {
      throw new Error('Not authenticated with Dropbox');
    }

    const response = await this.dropbox.filesGetMetadata({ path: `/${path}` });
    const metadata = response.result as files.FileMetadata;
    
    return {
      rev: metadata.rev,
      path: metadata.path_display || path,
      serverModified: new Date(metadata.server_modified),
      size: metadata.size
    };
  }

  async resolveConflict(path: string, localContent: string, serverContent: string): Promise<string> {
    try {
      const localData = JSON.parse(localContent);
      const serverData = JSON.parse(serverContent);

      // If entries have UUIDs, merge by most recent per entry
      if (Array.isArray(localData) && Array.isArray(serverData)) {
        const mergedEntries = new Map<string, any>();
        
        // Process local entries
        localData.forEach((entry: any) => {
          if (entry.uuid) {
            mergedEntries.set(entry.uuid, entry);
          }
        });

        // Process server entries, keeping most recent version
        serverData.forEach((entry: any) => {
          if (entry.uuid) {
            const existingEntry = mergedEntries.get(entry.uuid);
            if (!existingEntry || new Date(entry.lastModified) > new Date(existingEntry.lastModified)) {
              mergedEntries.set(entry.uuid, entry);
            }
          }
        });

        return JSON.stringify(Array.from(mergedEntries.values()));
      }

      // Default to most recent version if can't merge
      const localTimestamp = new Date(localData.lastModified);
      const serverTimestamp = new Date(serverData.lastModified);
      return localTimestamp > serverTimestamp ? localContent : serverContent;
    } catch (error) {
      console.error('Error during conflict resolution:', error);
      return serverContent; // Default to server version on error
    }
  }

  async syncPendingChanges(): Promise<void> {
    if (this.pendingUploads.size === 0) return;

    for (const [path, { content }] of this.pendingUploads) {
      try {
        await this.uploadFile(path, content);
      } catch (error) {
        console.error(`Error syncing ${path}:`, error);
      }
    }
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  logout(): void {
    localStorage.removeItem('dropbox_access_token');
    this.dropbox = null;
    this.syncStatus = {
      lastSync: null,
      isSyncing: false,
      error: null,
      pendingChanges: 0
    };
    this.pendingUploads.clear();
  }
}

export default DropboxService;