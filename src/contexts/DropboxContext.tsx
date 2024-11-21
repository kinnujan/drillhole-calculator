import React, { createContext, useContext, useState, useEffect } from 'react';
import { DropboxService } from '../services/DropboxService';

interface DropboxContextType {
  isAuthenticated: boolean;
  syncStatus: {
    isSyncing: boolean;
    lastSync: Date | null;
    pendingChanges: number;
    error: string | null;
  };
  authenticate: () => Promise<void>;
  syncPendingChanges: () => Promise<void>;
  logout: () => Promise<void>;
}

const DropboxContext = createContext<DropboxContextType | undefined>(undefined);

export const DropboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSync: null as Date | null,
    pendingChanges: 0,
    error: null as string | null,
  });

  useEffect(() => {
    // Check authentication status on mount
    DropboxService.isAuthenticated().then(setIsAuthenticated);
    
    // Set up periodic sync check
    const interval = setInterval(async () => {
      if (isAuthenticated) {
        const pendingChanges = await DropboxService.getPendingChanges();
        setSyncStatus(prev => ({ ...prev, pendingChanges }));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const authenticate = async () => {
    try {
      await DropboxService.authenticate();
      setIsAuthenticated(true);
    } catch (error) {
      setSyncStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      }));
    }
  };

  const syncPendingChanges = async () => {
    if (!isAuthenticated) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    try {
      await DropboxService.syncPendingChanges();
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        lastSync: new Date(),
        pendingChanges: 0 
      }));
    } catch (error) {
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Sync failed' 
      }));
    }
  };

  const logout = async () => {
    await DropboxService.logout();
    setIsAuthenticated(false);
    setSyncStatus({
      isSyncing: false,
      lastSync: null,
      pendingChanges: 0,
      error: null,
    });
  };

  return (
    <DropboxContext.Provider
      value={{
        isAuthenticated,
        syncStatus,
        authenticate,
        syncPendingChanges,
        logout,
      }}
    >
      {children}
    </DropboxContext.Provider>
  );
};

export const useDropbox = () => {
  const context = useContext(DropboxContext);
  if (context === undefined) {
    throw new Error('useDropbox must be used within a DropboxProvider');
  }
  return context;
};
