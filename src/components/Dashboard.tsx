import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Paper, List, ListItem, ListItemText, CircularProgress, Alert, Grid } from '@mui/material';
import DatabaseService from '../services/DatabaseService';
import { LogEntry } from '../models/LogEntry';
import { DropboxSync } from './DropboxSync';
import { LogEntryList } from './LogEntryList';

interface HoleGroup {
  holeid: string;
  entries: LogEntry[];
  totalDepth: number;
}

export const Dashboard: React.FC = () => {
  const [holes, setHoles] = useState<HoleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  useEffect(() => {
    loadHoles();
  }, []);

  const loadHoles = async () => {
    try {
      setLoading(true);
      const db = DatabaseService.getInstance();
      const entries = await db.db.logEntries.toArray();

      // Group entries by hole
      const holeMap = new Map<string, LogEntry[]>();
      entries.forEach(entry => {
        const entries = holeMap.get(entry.holeid) || [];
        entries.push(entry);
        holeMap.set(entry.holeid, entries);
      });

      // Create hole groups with sorted entries
      const holeGroups: HoleGroup[] = Array.from(holeMap.entries()).map(([holeid, entries]) => {
        const sortedEntries = entries.sort((a, b) => a.from - b.from);
        const totalDepth = Math.max(...entries.map(e => e.to));
        return { holeid, entries: sortedEntries, totalDepth };
      });

      setHoles(holeGroups.sort((a, b) => a.holeid.localeCompare(b.holeid)));
      setError(null);
    } catch (err) {
      setError('Failed to load holes');
      console.error('Error loading holes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" className="py-8">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper className="p-4">
            <div className="flex justify-between items-center">
              <Typography variant="h5" component="h1">
                QuickLog Dashboard
              </Typography>
              <DropboxSync className="w-64" />
            </div>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper className="p-4">
            <Typography variant="h6" component="h2" className="mb-4">
              Logged Holes
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {syncStatus === 'syncing' && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Synchronizing data...
              </Alert>
            )}

            {syncStatus === 'error' && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Sync error. Some changes may not be saved.
              </Alert>
            )}

            <LogEntryList entries={holes} isLoading={loading} error={error} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
