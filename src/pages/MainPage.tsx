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
  Typography,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import QuickLogForm from '../components/QuickLogForm';
import LogEntryList from '../components/LogEntryList';
import StripLog from '../components/StripLog';
import DrillholeSelector from '../components/DrillholeSelector';
import ConfigurationDialog from '../components/ConfigurationDialog';
import OverlapDialog from '../components/OverlapDialog';
import { LogEntry } from '../types';
import databaseService from '../services/DatabaseService';
import configurationService from '../services/ConfigurationService';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import historyService from '../services/HistoryService';
import { DeleteEntryCommand, AddEntryCommand, UpdateEntryCommand, SplitEntryCommand } from '../services/HistoryService';
import { v4 as uuidv4 } from 'uuid';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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
  const [configOpen, setConfigOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [darkMode, setDarkMode] = useState(configurationService.getConfig().darkMode);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [overlapState, setOverlapState] = useState<{
    newEntry: LogEntry | null;
    overlapResult: OverlapResult | null;
  }>({
    newEntry: null,
    overlapResult: null
  });

  useEffect(() => {
    // Update undo/redo state
    setCanUndo(historyService.canUndo());
    setCanRedo(historyService.canRedo());
  }, [entries]);

  useEffect(() => {
    const handleDatabaseEvent = (type: string, data: any) => {
      console.log('[MainPage] Received database event:', type, data);
      if (type === 'overlap') {
        setOverlapState({
          newEntry: data.newEntry,
          overlapResult: data.overlapResult
        });
        setShowNewEntryDialog(false); // Close the new entry dialog
      }
    };

    databaseService.addChangeListener(handleDatabaseEvent);
    return () => {
      databaseService.removeChangeListener(handleDatabaseEvent);
    };
  }, []);

  const handleDarkModeChange = (newDarkMode: boolean) => {
    setDarkMode(newDarkMode);
    configurationService.updateConfig({ darkMode: newDarkMode });
    window.location.reload();
  };

  const handleUndo = async () => {
    await historyService.undo();
    if (selectedDrillhole) {
      const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
      setEntries(updatedEntries);
    }
  };

  const handleRedo = async () => {
    await historyService.redo();
    if (selectedDrillhole) {
      const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
      setEntries(updatedEntries);
    }
  };

  // Load entries for selected drillhole
  useEffect(() => {
    const loadEntries = async () => {
      if (!selectedDrillhole) return;
      
      try {
        const loadedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
        setEntries(loadedEntries);
      } catch (error) {
        console.error('Error loading entries:', error);
      }
    };
    loadEntries();
  }, [selectedDrillhole]);

  const handleSubmit = async (entry: Omit<LogEntry, 'id'>) => {
    try {
      console.log('[MainPage] Submitting entry:', { entry, isEdit: !!editEntry });
      
      if (editEntry) {
        // Create and execute update command
        const command = new UpdateEntryCommand(editEntry, { ...entry, id: editEntry.id });
        console.log('[MainPage] Executing update command:', command);
        await historyService.executeCommand(command);
        setEditEntry(null);
        setEditDialogOpen(false);
      } else {
        // Add ID and other required fields to the new entry
        const newEntry: LogEntry = {
          ...entry,
          id: uuidv4(),
          drillhole_id: selectedDrillhole || '',
          synced: false,
          fields: entry.fields || {},
          created: new Date(),
          modified: new Date()
        };
        
        console.log('[MainPage] Creating new entry command:', newEntry);
        const command = new AddEntryCommand(newEntry);
        try {
          await historyService.executeCommand(command);
          // Close dialogs and reset state on success
          setShowNewEntryDialog(false);
          setPrefillData(null);
        } catch (error) {
          if (error instanceof Error && error.message === 'OVERLAP_DETECTED') {
            console.log('[MainPage] Overlap detected, letting overlap dialog handle it');
            return;
          }
          throw error; // Re-throw other errors
        }
      }
      
      // Refresh entries after submit
      if (selectedDrillhole) {
        console.log('[MainPage] Refreshing entries for drillhole:', selectedDrillhole);
        const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
        console.log('[MainPage] Updated entries:', updatedEntries);
        setEntries(updatedEntries);
      }
    } catch (error) {
      console.error('[MainPage] Error submitting entry:', error);
      // Show error message to user
      alert(`Error submitting entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleNewEntrySubmit = async (entry: Omit<LogEntry, 'id'>) => {
    try {
      console.log('[MainPage] Submitting new entry:', entry);
      
      // Add ID and other required fields to the entry
      const newEntry: LogEntry = {
        ...entry,
        id: uuidv4(),
        drillhole_id: selectedDrillhole || '',
        synced: false,
        fields: entry.fields || {},
        created: new Date(),
        modified: new Date()
      };

      // Create and execute command
      const command = new AddEntryCommand(newEntry);
      await historyService.executeCommand(command);
      
      // Clear dialog state
      setShowNewEntryDialog(false);
      setPrefillData(null);
      
      // Refresh entries
      if (selectedDrillhole) {
        const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
        setEntries(updatedEntries);
      }
    } catch (error) {
      console.error('[MainPage] Error submitting new entry:', error);
    }
  };

  const handleDeleteClick = (id: string) => {
    // Find the entry to delete
    const entryToDelete = entries.find(entry => entry.id === id);
    if (entryToDelete) {
      setDeleteEntry(entryToDelete);
    }
  };

  const handleDelete = async () => {
    try {
      if (!deleteEntry || !selectedDrillhole) return;

      const command = new DeleteEntryCommand(deleteEntry, selectedDrillhole);
      await historyService.executeCommand(command);
      
      // Clear the delete state
      setDeleteEntry(null);
      
      // Refresh the entries list
      const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
      console.log('[MainPage] Updated entries after delete:', updatedEntries);
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleDrillholeSelect = (drillholeId: string) => {
    setSelectedDrillhole(drillholeId);
  };

  const handleAddBetween = (from: number, to: number) => {
    console.log('[MainPage] Opening add dialog for interval:', { from, to });
    setPrefillData({
      from: from,
      to: to,
      drillhole_id: selectedDrillhole || '',
      lithology: '',
      color: '',
      texture: '',
      minerals: '',
      mineralized: false,
      structures: '',
      notes: '',
      synced: false,
      fields: {},
      created: new Date(),
      modified: new Date()
    });
    setShowNewEntryDialog(true);
  };

  const handleSplit = async (entry: LogEntry) => {
    try {
      if (!entry || !selectedDrillhole) {
        console.error('[MainPage] Cannot split: No entry or drillhole selected');
        return;
      }

      console.log('[MainPage] Starting split operation for entry:', entry);
      
      // First verify the entry still exists and get fresh data
      const currentEntry = await databaseService.getEntry(entry.id);
      if (!currentEntry) {
        console.error(`[MainPage] Entry ${entry.id} no longer exists`);
        return;
      }
      console.log('[MainPage] Current entry found:', currentEntry);
      
      // Calculate the midpoint
      const midpoint = Number(((currentEntry.from + currentEntry.to) / 2).toFixed(2));
      console.log(`[MainPage] Calculated midpoint: ${midpoint}`);
      
      // Create two new entries with the same values
      const commonFields = {
        drillhole_id: currentEntry.drillhole_id,
        fields: { ...currentEntry.fields },
        lithology: currentEntry.lithology,
        color: currentEntry.color || '',
        texture: currentEntry.texture || '',
        minerals: currentEntry.minerals || '',
        mineralized: currentEntry.mineralized || false,
        structures: currentEntry.structures || '',
        notes: currentEntry.notes || '',
        created: new Date(),
        modified: new Date(),
        synced: false
      };

      // Create first half
      const firstHalf: LogEntry = {
        ...commonFields,
        id: uuidv4(),
        from: currentEntry.from,
        to: midpoint,
        originalEntryId: currentEntry.id
      };
      
      // Create second half
      const secondHalf: LogEntry = {
        ...commonFields,
        id: uuidv4(),
        from: midpoint,
        to: currentEntry.to,
        originalEntryId: currentEntry.id
      };

      console.log('[MainPage] Created new entries:', { firstHalf, secondHalf });
      
      // Create and execute the command
      console.log('[MainPage] Creating split command...');
      const command = new SplitEntryCommand(currentEntry, firstHalf, secondHalf);
      console.log('[MainPage] Executing split command...');
      await historyService.executeCommand(command);

      console.log(`[MainPage] Successfully split entry from ${currentEntry.from}-${currentEntry.to} into ${firstHalf.from}-${firstHalf.to} and ${secondHalf.from}-${secondHalf.to}`);

      // Refresh the entries list
      console.log('[MainPage] Refreshing entries list...');
      const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
      console.log('[MainPage] Updated entries:', updatedEntries);
      setEntries(updatedEntries);
      console.log('[MainPage] Split operation completed successfully');
    } catch (error) {
      console.error('[MainPage] Error splitting entry:', error);
      
      // Refresh the entries list to ensure UI is in sync
      if (selectedDrillhole) {
        console.log('[MainPage] Refreshing entries after error...');
        const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
        console.log('[MainPage] Updated entries after error:', updatedEntries);
        setEntries(updatedEntries);
      }
    }
  };

  const handleCancelSplit = async (originalEntryId: string) => {
    try {
      if (!selectedDrillhole) return;

      // Get all entries with this originalEntryId
      const splitEntries = entries.filter(e => e.originalEntryId === originalEntryId);
      if (splitEntries.length === 0) return;

      // Get the original entry from backup
      const originalEntry = await databaseService.getBackupEntry(originalEntryId);
      if (!originalEntry) {
        console.error('Original entry not found in backup');
        return;
      }

      // Delete all split entries
      for (const entry of splitEntries) {
        await databaseService.deleteEntry(entry.id);
      }

      // Restore the original entry
      await databaseService.addEntry(originalEntry);

      // Refresh the entries list
      const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
      console.log('[MainPage] Updated entries after cancel split:', updatedEntries);
      setEntries(updatedEntries);

      console.log('Successfully cancelled split');
    } catch (error) {
      console.error('Error cancelling split:', error);
    }
  };

  const handleEdit = (entry: LogEntry) => {
    console.log('[MainPage] Editing entry:', entry);
    setEditEntry(entry);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditEntry(null);
  };

  const handleOverlapConfirm = async (action: 'split' | 'replace' | 'cancel') => {
    try {
      if (!overlapState.newEntry || !overlapState.overlapResult?.overlappingEntries.length) {
        return;
      }

      if (action === 'cancel') {
        setOverlapState({ newEntry: null, overlapResult: null });
        return;
      }

      await databaseService.handleOverlap(
        overlapState.newEntry,
        overlapState.overlapResult.overlappingEntries[0],
        action
      );

      // Refresh entries after handling overlap
      if (selectedDrillhole) {
        const updatedEntries = await databaseService.getEntriesByHole(selectedDrillhole);
        setEntries(updatedEntries);
      }

      // Reset overlap state
      setOverlapState({ newEntry: null, overlapResult: null });
    } catch (error) {
      console.error('[MainPage] Error handling overlap:', error);
      alert(`Error handling overlap: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!selectedDrillhole) {
    return <DrillholeSelector onDrillholeSelect={handleDrillholeSelect} />;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          QuickLogger
        </Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} mt={2}>
        <h2>Drillhole: {selectedDrillhole}</h2>
        <Box>
          <IconButton 
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo"
          >
            <UndoIcon />
          </IconButton>
          <IconButton 
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo"
          >
            <RedoIcon />
          </IconButton>
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
          <IconButton 
            onClick={() => setConfigOpen(true)} 
            color="primary"
            title="Settings"
          >
            <SettingsIcon />
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
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onAddBetween={(from, to) => {
                setPrefillData({
                  from: from,
                  to: to,
                  drillhole_id: selectedDrillhole || '',
                  lithology: '',
                  color: '',
                  texture: '',
                  minerals: '',
                  mineralized: false,
                  structures: '',
                  notes: '',
                  synced: false,
                  fields: {},
                  created: new Date(),
                  modified: new Date()
                });
                setShowNewEntryDialog(true);
              }}
              onSplit={handleSplit}
              onCancelSplit={handleCancelSplit}
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
        <DialogTitle>
          New Log Entry
          <IconButton
            aria-label="close"
            onClick={() => {
              setShowNewEntryDialog(false);
              setPrefillData(null);
            }}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <QuickLogForm
            onSubmit={handleSubmit}
            editEntry={null}
            drillholeId={selectedDrillhole || ''}
            prefillData={prefillData}
            previousEntry={entries.length > 0 ? entries[entries.length - 1] : null}
            onQuickFill={() => {
              const previousEntry = entries[entries.length - 1];
              if (!previousEntry) return;
              
              const newFrom = Number(previousEntry.to);
              const newTo = Number(previousEntry.to) + (Number(previousEntry.to) - Number(previousEntry.from));
              
              setPrefillData({
                ...previousEntry,
                drillhole_id: selectedDrillhole || '',
                from: newFrom,
                to: newTo,
                id: undefined,
                created: new Date(),
                modified: new Date()
              });
            }}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end', px: 3, pb: 2 }}>
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
        open={editDialogOpen} 
        onClose={handleEditClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Log Entry
          <IconButton
            aria-label="close"
            onClick={handleEditClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editEntry && (
            <QuickLogForm
              onSubmit={handleSubmit}
              editEntry={editEntry}
              drillholeId={selectedDrillhole || ''}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteEntry !== null}
        onClose={() => setDeleteEntry(null)}
      >
        <DialogTitle>Delete Entry</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this entry?</Typography>
          {deleteEntry && (
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                From: {deleteEntry.from.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                To: {deleteEntry.to.toFixed(2)}
              </Typography>
              {deleteEntry.lithology && (
                <Typography variant="body2" color="textSecondary">
                  Lithology: {deleteEntry.lithology}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteEntry(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Overlap Dialog */}
      <OverlapDialog
        open={!!overlapState.newEntry && !!overlapState.overlapResult}
        onClose={() => handleOverlapConfirm('cancel')}
        newEntry={overlapState.newEntry}
        overlapResult={overlapState.overlapResult}
        onConfirm={handleOverlapConfirm}
      />

      {/* Configuration Dialog */}
      <ConfigurationDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        darkMode={darkMode}
        onDarkModeChange={handleDarkModeChange}
      />
    </Container>
  );
};

export default MainPage;
