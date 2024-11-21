import React from 'react';
import { Button, CircularProgress, Alert, Snackbar, Badge } from '@mui/material';
import { CloudUpload, CloudOff, CloudDone, Sync } from '@mui/icons-material';
import { useDropbox } from '../hooks/useDropbox';

interface DropboxSyncProps {
  className?: string;
}

export const DropboxSync: React.FC<DropboxSyncProps> = ({ className }) => {
  const {
    isAuthenticated,
    syncStatus,
    authenticate,
    syncPendingChanges,
    logout
  } = useDropbox();

  const [showError, setShowError] = React.useState(false);

  React.useEffect(() => {
    if (syncStatus.error) {
      setShowError(true);
    }
  }, [syncStatus.error]);

  const handleSync = async () => {
    if (!isAuthenticated) {
      await authenticate();
    } else {
      await syncPendingChanges();
    }
  };

  const getSyncIcon = () => {
    if (!isAuthenticated) return <CloudOff />;
    if (syncStatus.isSyncing) return <CircularProgress size={24} />;
    if (syncStatus.pendingChanges > 0) {
      return (
        <Badge badgeContent={syncStatus.pendingChanges} color="warning">
          <CloudUpload />
        </Badge>
      );
    }
    return <CloudDone />;
  };

  const getButtonText = () => {
    if (!isAuthenticated) return 'Connect to Dropbox';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.pendingChanges > 0) return `Sync (${syncStatus.pendingChanges} pending)`;
    return 'Synced';
  };

  const getLastSyncText = () => {
    if (!syncStatus.lastSync) return 'Never synced';
    const timeAgo = Math.floor((Date.now() - syncStatus.lastSync.getTime()) / 1000 / 60);
    if (timeAgo < 1) return 'Just now';
    if (timeAgo < 60) return `${timeAgo} minutes ago`;
    return `${Math.floor(timeAgo / 60)} hours ago`;
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <Button
        variant="contained"
        color={isAuthenticated ? 'primary' : 'secondary'}
        onClick={handleSync}
        startIcon={getSyncIcon()}
        disabled={syncStatus.isSyncing}
        className="w-full"
      >
        {getButtonText()}
      </Button>

      {isAuthenticated && (
        <>
          <div className="text-sm text-gray-600">
            Last sync: {getLastSyncText()}
          </div>
          <Button
            variant="text"
            color="inherit"
            size="small"
            onClick={logout}
            className="text-gray-500"
          >
            Disconnect
          </Button>
        </>
      )}

      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
      >
        <Alert
          onClose={() => setShowError(false)}
          severity="error"
          variant="filled"
        >
          {syncStatus.error}
        </Alert>
      </Snackbar>
    </div>
  );
};
