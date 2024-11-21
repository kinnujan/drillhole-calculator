import React, { useState, useEffect } from 'react';
import {
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
} from '@mui/material';
import QuickLogForm from '../components/QuickLogForm';
import LogEntryList from '../components/LogEntryList';
import StripLog from '../components/StripLog';
import { LogEntry } from '../types';
import DatabaseService from '../services/DatabaseService';

const MainPage: React.FC = () => {
  const [editEntry, setEditEntry] = useState<LogEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LogEntry | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  // Load entries when component mounts
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const loadedEntries = await dbService.getAllEntries();
        setEntries(loadedEntries);
      } catch (error) {
        console.error('Error loading entries:', error);
      }
    };
    loadEntries();
  }, []);

  const handleSubmit = async (entry: LogEntry) => {
    try {
      const dbService = DatabaseService.getInstance();
      if (editEntry) {
        await dbService.updateEntry(entry);
        setEditEntry(null);
      } else {
        await dbService.addEntry(entry);
      }
      // Refresh entries after submit
      const updatedEntries = await dbService.getAllEntries();
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error submitting entry:', error);
    }
  };

  const handleEdit = (entry: LogEntry) => {
    setEditEntry(entry);
  };

  const handleDelete = (entry: LogEntry) => {
    setDeleteEntry(entry);
  };

  const confirmDelete = async () => {
    if (deleteEntry) {
      try {
        const dbService = DatabaseService.getInstance();
        await dbService.deleteEntry(deleteEntry.id);
        // Refresh entries after delete
        const updatedEntries = await dbService.getAllEntries();
        setEntries(updatedEntries);
        setDeleteEntry(null);
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <QuickLogForm
              onSubmit={handleSubmit}
              initialValues={editEntry || undefined}
            />
          </Paper>
        </Grid>

        {/* Strip Log */}
        <Grid item xs={12} md={2}>
          <StripLog entries={entries} height={600} />
        </Grid>

        {/* Table */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <LogEntryList
              entries={entries}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteEntry)}
        onClose={() => setDeleteEntry(null)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this entry?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteEntry(null)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MainPage;
