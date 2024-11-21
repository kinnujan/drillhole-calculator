import { useState, useEffect, useCallback } from 'react';
import DropboxService, { SyncStatus, FileMetadata } from '../services/DropboxService';

interface UseDropboxReturn {
  isAuthenticated: boolean;
  syncStatus: SyncStatus;
  authenticate: () => Promise<void>;
  syncFile: (path: string, content: string) => Promise<void>;
  downloadFile: (path: string) => Promise<string | null>;
  getFileMetadata: (path: string) => Promise<FileMetadata | null>;
  syncPendingChanges: () => Promise<void>;
  logout: () => void;
}

export function useDropbox(): UseDropboxReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    isSyncing: false,
    error: null,
    pendingChanges: 0
  });

  const dropboxService = DropboxService.getInstance();

  useEffect(() => {
    // Check initial authentication state
    setIsAuthenticated(dropboxService.isAuthenticated());
    
    // Handle OAuth callback
    if (window.location.hash.includes('access_token')) {
      const success = dropboxService.handleAuthCallback();
      if (success) {
        setIsAuthenticated(true);
        // Remove the access token from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // Set up periodic sync for pending changes
    const syncInterval = setInterval(() => {
      if (dropboxService.isAuthenticated() && syncStatus.pendingChanges > 0) {
        dropboxService.syncPendingChanges();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(syncInterval);
  }, [syncStatus.pendingChanges]);

  // Update sync status whenever it changes
  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(dropboxService.getSyncStatus());
    };

    // Update initial status
    updateStatus();

    // Set up periodic status updates
    const statusInterval = setInterval(updateStatus, 5000);

    return () => clearInterval(statusInterval);
  }, []);

  const authenticate = useCallback(async () => {
    try {
      await dropboxService.authenticate();
    } catch (error) {
      console.error('Authentication error:', error);
    }
  }, []);

  const syncFile = useCallback(async (path: string, content: string) => {
    try {
      const metadata = await dropboxService.getFileMetadata(path).catch(() => null);
      await dropboxService.uploadFile(path, content, metadata?.rev);
      setSyncStatus(dropboxService.getSyncStatus());
    } catch (error) {
      console.error('Sync error:', error);
    }
  }, []);

  const downloadFile = useCallback(async (path: string) => {
    try {
      const content = await dropboxService.downloadFile(path);
      setSyncStatus(dropboxService.getSyncStatus());
      return content;
    } catch (error) {
      console.error('Download error:', error);
      return null;
    }
  }, []);

  const getFileMetadata = useCallback(async (path: string) => {
    try {
      return await dropboxService.getFileMetadata(path);
    } catch (error) {
      console.error('Metadata error:', error);
      return null;
    }
  }, []);

  const syncPendingChanges = useCallback(async () => {
    try {
      await dropboxService.syncPendingChanges();
      setSyncStatus(dropboxService.getSyncStatus());
    } catch (error) {
      console.error('Sync pending changes error:', error);
    }
  }, []);

  const logout = useCallback(() => {
    dropboxService.logout();
    setIsAuthenticated(false);
    setSyncStatus({
      lastSync: null,
      isSyncing: false,
      error: null,
      pendingChanges: 0
    });
  }, []);

  return {
    isAuthenticated,
    syncStatus,
    authenticate,
    syncFile,
    downloadFile,
    getFileMetadata,
    syncPendingChanges,
    logout
  };
}