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
  Box,
} from '@mui/material';
import QuickLogForm from '../components/QuickLogForm';
import LogEntryList from '../components/LogEntryList';
import StripLog from '../components/StripLog';
import DrillholeSelector from '../components/DrillholeSelector';
import { LogEntry } from '../types';
import DatabaseService from '../services/DatabaseService';

const MainPage: React.FC = () => {
  const [editEntry, setEditEntry] = useState<LogEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LogEntry | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [selectedDrillhole, setSelectedDrillhole] = useState<string | null>(null);

  // Load entries for selected drillhole
  useEffect(() => {
    const loadEntries = async () => {
      if (!selectedDrillhole) return;
      
      try {
        const dbService = DatabaseService.getInstance();
        const loadedEntries = await dbService.getEntriesByHole(selectedDrillhole);
        setEntries(loadedEntries);
      } catch (error) {
        console.error('Error loading entries:', error);
      }
    };
    loadEntries();
  }, [selectedDrillhole]);

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
      const updatedEntries = await dbService.getEntriesByHole(selectedDrillhole!);
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error submitting entry:', error);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;

    try {
      const dbService = DatabaseService.getInstance();
      await dbService.deleteEntry(deleteEntry.id!);
      setDeleteEntry(null);
      // Refresh entries after delete
      const updatedEntries = await dbService.getEntriesByHole(selectedDrillhole!);
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleDrillholeSelect = (drillholeId: string) => {
    setSelectedDrillhole(drillholeId);
  };

  if (!selectedDrillhole) {
    return <DrillholeSelector onDrillholeSelect={handleDrillholeSelect} />;
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} mt={2}>
        <h2>Drillhole: {selectedDrillhole}</h2>
        <Button
          variant="outlined"
          onClick={() => setSelectedDrillhole(null)}
        >
          Change Drillhole
        </Button>
      </Box>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <QuickLogForm
              onSubmit={handleSubmit}
              editEntry={editEntry}
              drillholeId={selectedDrillhole}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <LogEntryList
              entries={entries}
              onEdit={setEditEntry}
              onDelete={setDeleteEntry}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <StripLog entries={entries} />
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={!!deleteEntry} onClose={() => setDeleteEntry(null)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this entry?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteEntry(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MainPage;
