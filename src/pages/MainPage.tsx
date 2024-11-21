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
  IconButton,
  Collapse,
} from '@mui/material';
import QuickLogForm from '../components/QuickLogForm';
import LogEntryList from '../components/LogEntryList';
import StripLog from '../components/StripLog';
import DrillholeSelector from '../components/DrillholeSelector';
import { LogEntry } from '../types';
import DatabaseService from '../services/DatabaseService';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const MainPage: React.FC = () => {
  const [editEntry, setEditEntry] = useState<LogEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LogEntry | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [selectedDrillhole, setSelectedDrillhole] = useState<string | null>(null);
  const [showNewEntryDialog, setShowNewEntryDialog] = useState(false);
  const [showStriplog, setShowStriplog] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<LogEntry> | null>(null);
  const [splitData, setSplitData] = useState<{
    originalEntry: LogEntry;
    splitPoint: number;
  } | null>(null);

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
        // If this was a split entry, adjust surrounding entries
        const allEntries = await dbService.getEntriesByHole(selectedDrillhole!);
        const currentIndex = allEntries.findIndex(e => e.id === editEntry.id);
        
        if (currentIndex > -1) {
          const beforeEntry = currentIndex > 0 ? allEntries[currentIndex - 1] : null;
          const afterEntry = currentIndex < allEntries.length - 1 ? allEntries[currentIndex + 1] : null;
          
          // Adjust the entry before this one
          if (beforeEntry && beforeEntry.to !== entry.from) {
            await dbService.updateEntry({
              ...beforeEntry,
              to: entry.from
            });
          }
          
          // Adjust the entry after this one
          if (afterEntry && afterEntry.from !== entry.to) {
            await dbService.updateEntry({
              ...afterEntry,
              from: entry.to
            });
          }
        }
        
        // Update the current entry
        await dbService.updateEntry(entry);
        setEditEntry(null);
      } else {
        await dbService.addEntry(entry);
      }
      
      // Close dialogs and reset state
      setShowNewEntryDialog(false);
      setPrefillData(null);
      
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

  const handleAddBetween = (prefill: Partial<LogEntry>) => {
    setPrefillData(prefill);
    setShowNewEntryDialog(true);
  };

  const handleSplit = async (entry: LogEntry) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Calculate three equal parts
      const intervalLength = entry.to - entry.from;
      const thirdLength = intervalLength / 3;
      const firstBreak = entry.from + thirdLength;
      const secondBreak = entry.from + (2 * thirdLength);
      
      // Create three new entries, all with the same values
      const beforeEntry: LogEntry = {
        ...entry,
        id: undefined, // Let DB assign new ID
        from: entry.from,
        to: firstBreak,
      };
      
      const middleEntry: LogEntry = {
        ...entry,
        id: undefined, // Let DB assign new ID
        from: firstBreak,
        to: secondBreak,
      };
      
      const afterEntry: LogEntry = {
        ...entry,
        id: undefined, // Let DB assign new ID
        from: secondBreak,
        to: entry.to,
      };

      // Delete the original entry
      await dbService.deleteEntry(entry.id!);
      
      // Add the new entries
      await dbService.addEntry(beforeEntry);
      const newMiddleEntry = await dbService.addEntry(middleEntry);
      await dbService.addEntry(afterEntry);

      // Set up the middle entry for editing
      setEditEntry(newMiddleEntry);

      // Refresh entries
      const updatedEntries = await dbService.getEntriesByHole(selectedDrillhole!);
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error splitting entry:', error);
    }
  };

  if (!selectedDrillhole) {
    return <DrillholeSelector onDrillholeSelect={handleDrillholeSelect} />;
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} mt={2}>
        <h2>Drillhole: {selectedDrillhole}</h2>
        <Box>
          <IconButton 
            onClick={() => setShowStriplog(!showStriplog)}
            color={showStriplog ? "primary" : "default"}
            title={showStriplog ? "Hide Striplog" : "Show Striplog"}
          >
            {showStriplog ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </IconButton>
          <IconButton
            onClick={() => setShowNewEntryDialog(true)}
            color="primary"
            title="Add New Entry"
          >
            <AddIcon />
          </IconButton>
          <Button
            variant="outlined"
            onClick={() => setSelectedDrillhole(null)}
            sx={{ ml: 1 }}
          >
            Change Drillhole
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={showStriplog ? 8 : 12}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <LogEntryList
              entries={entries}
              onEdit={setEditEntry}
              onDelete={setDeleteEntry}
              onAddBetween={handleAddBetween}
              onSplit={handleSplit}
            />
          </Paper>
        </Grid>
        {showStriplog && (
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
              <StripLog entries={entries} />
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* New Entry Dialog */}
      <Dialog 
        open={showNewEntryDialog} 
        onClose={() => {
          setShowNewEntryDialog(false);
          setPrefillData(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>New Log Entry</DialogTitle>
        <DialogContent>
          <QuickLogForm
            onSubmit={handleSubmit}
            editEntry={null}
            drillholeId={selectedDrillhole}
            prefillData={prefillData}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowNewEntryDialog(false);
            setPrefillData(null);
          }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog 
        open={!!editEntry} 
        onClose={() => setEditEntry(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Log Entry</DialogTitle>
        <DialogContent>
          <QuickLogForm
            onSubmit={handleSubmit}
            editEntry={editEntry}
            drillholeId={selectedDrillhole}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditEntry(null)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
