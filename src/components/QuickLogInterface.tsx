import React, { useEffect, useState, MouseEvent } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Grid,
  Typography,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { LogEntryField, LogEntryManager } from '../models/LogEntry';
import { LogEntry } from '../types';
import { ConfigService } from '../services/ConfigService';
import DatabaseService from '../services/DatabaseService';
import LogEntryList from './LogEntryList';
import { v4 as uuidv4 } from 'uuid';

interface QuickLogInterfaceProps {
  holeid: string;
}

export const QuickLogInterface: React.FC<QuickLogInterfaceProps> = ({ holeid }) => {
  const [fields, setFields] = useState<LogEntryField[]>([]);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<LogEntry>({
    id: uuidv4(),
    drillhole_id: holeid,
    from: 0,
    to: 1,
    lithology: '',
    fields: {},
    created: new Date(),
    modified: new Date(),
    synced: false,
    originalEntryId: undefined
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [splitState, setSplitState] = useState<{
    originalEntry: LogEntry | null;
    topEntry: LogEntry | null;
    middleEntry: LogEntry | null;
    bottomEntry: LogEntry | null;
  }>({
    originalEntry: null,
    topEntry: null,
    middleEntry: null,
    bottomEntry: null
  });
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [isAddingBetween, setIsAddingBetween] = useState(false);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await loadConfiguration();
      await loadEntries();
    };
    init();
  }, [holeid]);

  useEffect(() => {
    return () => {
      // Clean up auto-save timer on unmount
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, []);

  // Update current entry when entries change
  useEffect(() => {
    if (!isAddingBetween && !showSplitDialog) {
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        const newFrom = Number(lastEntry.to.toFixed(2));
        setCurrentEntry(prev => ({
          ...prev,
          drillhole_id: holeid,
          from: newFrom,
          to: Number((newFrom + 1).toFixed(2))
        }));
      } else {
        setCurrentEntry(prev => ({
          ...prev,
          drillhole_id: holeid,
          from: 0,
          to: 1
        }));
      }
    }
  }, [entries, holeid, isAddingBetween, showSplitDialog]);

  const loadConfiguration = async () => {
    try {
      const configService = ConfigService.getInstance();
      const fields = configService.getFields();
      setFields(fields);
    } catch (error) {
      console.error('Error loading configuration:', error);
      setErrors(['Failed to load configuration']);
    }
  };

  const loadEntries = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const holeEntries = await dbService.getEntriesByHole(holeid);
      setEntries(holeEntries);
      setLoading(false);
    } catch (error) {
      console.error('Error loading entries:', error);
      setErrors(['Failed to load entries']);
      setLoading(false);
    }
  };

  const validateEntry = (): string[] => {
    const errors: string[] = [];

    // Validate required fields
    if (!currentEntry.from || !currentEntry.to) {
      errors.push('From and To depths are required');
      return errors;
    }

    if (currentEntry.from !== undefined && currentEntry.to !== undefined) {
      if (currentEntry.from >= currentEntry.to) {
        errors.push('From depth must be less than To depth');
        return errors;
      }

      // Check for overlapping entries
      const overlappingEntry = entries.find(entry => {
        // Skip current entry if we're editing
        if (entry.id === currentEntry.id) return false;
        
        // Check if the new entry overlaps with any existing entry
        return (currentEntry.from < entry.to && currentEntry.to > entry.from);
      });

      if (overlappingEntry) {
        errors.push(`Entry overlaps with interval ${overlappingEntry.from} to ${overlappingEntry.to}`);
        return errors;
      }

      // Only validate continuity for new entries at the end
      if (entries.length > 0 && !isAddingBetween) {
        const lastEntry = entries[entries.length - 1];
        if (Math.abs(currentEntry.from - lastEntry.to) > 0.001) { // Allow small floating point differences
          errors.push('Interval must be continuous with previous entry');
          return errors;
        }
      }

      // Validate that entries being added between are properly bounded
      if (isAddingBetween) {
        const surroundingEntries = entries.filter(entry => 
          entry.from <= currentEntry.from && entry.to >= currentEntry.to
        );
        
        if (surroundingEntries.length === 0) {
          errors.push('New entry must fit within existing interval');
          return errors;
        }
      }
    }

    // Validate fields
    if (currentEntry.fields) {
      const fieldErrors = LogEntryManager.validateFields(currentEntry, fields);
      errors.push(...fieldErrors);
    }

    return errors;
  };

  const handleFieldChange = (fieldName: string, value: string | number | boolean) => {
    const field = fields.find(f => f.name === fieldName);
    if (!field) {
      console.error(`Unknown field: ${fieldName}`);
      return;
    }

    let validatedValue = value;

    // Validate numeric fields
    if (field.type === 'number') {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        setErrors([`${fieldName} must be a valid number`]);
        return;
      }
      validatedValue = numValue;
    }

    // Validate domain fields
    if (field.type === 'domain' && typeof value === 'string') {
      if (field.domain && !field.domain.includes(value)) {
        setErrors([`Invalid value for ${fieldName}`]);
        return;
      }
    }

    setCurrentEntry(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: validatedValue,
      },
    }));

    // Clear existing auto-save timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new auto-save timer
    const timer = setTimeout(() => {
      handleSave(true);
    }, 3000); // Auto-save after 3 seconds of inactivity

    setAutoSaveTimer(timer);
  };

  const handleIntervalChange = (field: 'from' | 'to', value: string) => {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      setErrors([`${field} must be a valid number`]);
      return;
    }

    // Ensure we're working with 2 decimal places
    const roundedValue = Number(numValue.toFixed(2));
    
    setCurrentEntry(prev => ({
      ...prev,
      [field]: roundedValue,
    }));

    // Clear validation errors when user is typing
    setErrors([]);
  };

  const handleSave = async (event?: MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
    }
    const validationErrors = validateEntry();
    if (validationErrors.length > 0) {
      if (!event) {
        setErrors(validationErrors);
      }
      return;
    }

    try {
      setSaveStatus('saving');
      const dbService = DatabaseService.getInstance();
      const entry = LogEntryManager.createEntry(
        holeid,
        currentEntry.from!,
        currentEntry.to!,
        currentEntry.fields!
      );

      await dbService.addEntry(entry);
      
      // Reset form and update entries
      const newFrom = Number(entry.to.toFixed(2));
      setCurrentEntry(prev => ({
        ...prev,
        drillhole_id: holeid,
        from: newFrom,
        to: Number((newFrom + 1).toFixed(2)),
        fields: {} // Only clear fields after successful save
      }));
      
      await loadEntries();
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      setIsAddingBetween(false); // Reset adding between state after save
    } catch (error) {
      console.error('Error saving entry:', error);
      setSaveStatus('error');
      setErrors(['Failed to save entry']);
    }
  };

  const handleAutoSave = async () => {
    const validationErrors = validateEntry();
    if (validationErrors.length === 0) {
      await handleSave();
    }
  };

  useEffect(() => {
    // Auto-save when fields change
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    const timer = setTimeout(handleAutoSave, 2000);
    setAutoSaveTimer(timer);

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [currentEntry.fields]);

  const handleSplitClick = async (entry: LogEntry) => {
    try {
      const dbService = DatabaseService.getInstance();
      
      // Backup the original entry first
      await dbService.backupEntry(entry);

      // Calculate split points
      const interval = entry.to - entry.from;
      const firstThird = Number((entry.from + (interval / 3)).toFixed(2));
      const secondThird = Number((entry.from + (2 * interval / 3)).toFixed(2));

      // Create split entries with all fields preserved
      const topEntry = {
        ...entry,
        id: uuidv4(),
        from: Number(entry.from.toFixed(2)),
        to: firstThird,
        originalEntryId: entry.id,
        fields: {...entry.fields},
        created: new Date(),
        modified: new Date()
      };

      const middleEntry = {
        ...entry,
        id: uuidv4(),
        from: firstThird,
        to: secondThird,
        originalEntryId: entry.id,
        fields: {...entry.fields},
        created: new Date(),
        modified: new Date()
      };

      const bottomEntry = {
        ...entry,
        id: uuidv4(),
        from: secondThird,
        to: Number(entry.to.toFixed(2)),
        originalEntryId: entry.id,
        fields: {...entry.fields},
        created: new Date(),
        modified: new Date()
      };

      setSplitState({
        originalEntry: entry,
        topEntry,
        middleEntry,
        bottomEntry
      });

      setShowSplitDialog(true);
    } catch (error) {
      console.error('Error preparing split:', error);
      setErrors(['Failed to prepare split']);
    }
  };

  const handleSplitCancel = async () => {
    if (splitState.originalEntry) {
      try {
        const dbService = DatabaseService.getInstance();
        
        // Get the original entry from backup
        const originalEntry = await dbService.getBackupEntry(splitState.originalEntry.id);
        if (originalEntry) {
          // Delete all split entries first
          await dbService.deleteEntriesByOriginalId(splitState.originalEntry.id);
          
          // Restore the original entry from backup
          await dbService.addEntry(originalEntry);
          
          // Reset current entry to after the restored entry
          setCurrentEntry(prev => ({
            ...prev,
            drillhole_id: holeid,
            from: Number(originalEntry.to.toFixed(2)),
            to: Number((originalEntry.to + 1).toFixed(2))
          }));

          await loadEntries();
        }
      } catch (error) {
        console.error('Error cancelling split:', error);
        setErrors(['Failed to cancel split']);
      }
    }

    setShowSplitDialog(false);
    setSplitState({
      originalEntry: null,
      topEntry: null,
      middleEntry: null,
      bottomEntry: null
    });
  };

  const handleSplitConfirm = async () => {
    if (!splitState.originalEntry || !splitState.topEntry || !splitState.middleEntry || !splitState.bottomEntry) {
      setErrors(['Invalid split state']);
      return;
    }
    
    try {
      const dbService = DatabaseService.getInstance();

      // Backup all entries before proceeding
      await Promise.all([
        dbService.backupEntry(splitState.originalEntry),
        dbService.backupEntry(splitState.topEntry),
        dbService.backupEntry(splitState.middleEntry),
        dbService.backupEntry(splitState.bottomEntry)
      ]);

      // Delete original entry and its backup
      await dbService.deleteEntry(splitState.originalEntry.id);
      await dbService.deleteBackup(splitState.originalEntry.id);

      // Add new entries in order
      await Promise.all([
        dbService.addEntry(splitState.topEntry),
        dbService.addEntry(splitState.middleEntry),
        dbService.addEntry(splitState.bottomEntry)
      ]);

      // Set current entry to after the last split part
      if (splitState.bottomEntry) {
        setCurrentEntry(prev => ({
          ...prev,
          drillhole_id: holeid,
          from: Number(splitState.bottomEntry!.to.toFixed(2)),
          to: Number((splitState.bottomEntry!.to + 1).toFixed(2))
        }));
      }

      await loadEntries();
    } catch (error) {
      console.error('Error splitting entry:', error);
      setErrors(['Failed to split entry. Please try again or contact support.']);
    }

    setShowSplitDialog(false);
    setSplitState({
      originalEntry: null,
      topEntry: null,
      middleEntry: null,
      bottomEntry: null
    });
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      setErrors(['Cannot delete entry: Invalid ID']);
      return;
    }

    try {
      const dbService = DatabaseService.getInstance();
      
      // Get the entry before deletion for potential restore
      const entryToDelete = await dbService.getEntry(id);
      if (!entryToDelete) {
        throw new Error('Entry not found');
      }

      // Create backup before deletion
      await dbService.backupEntry(entryToDelete);

      // Delete the entry
      await dbService.deleteEntry(id);
      
      // Clean up any split entries if this was an original entry
      await dbService.deleteEntriesByOriginalId(id);
      
      await loadEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      setErrors(['Failed to delete entry. Please try again or contact support.']);
    }
  };

  const handleAddBetween = (from: number, to: number) => {
    setIsAddingBetween(true);
    const interval = to - from;
    const defaultTo = Number((from + (interval / 2)).toFixed(2));
    
    setCurrentEntry(prev => ({
      ...prev,
      drillhole_id: holeid,
      from: Number(from.toFixed(2)),
      to: defaultTo
    }));
  };

  const handleEdit = (entry: LogEntry) => {
    setCurrentEntry(entry);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="md">
      <Box py={4}>
        <Typography variant="h5" gutterBottom>
          Logging Hole: {holeid}
        </Typography>

        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </Alert>
        )}

        {saveStatus === 'saved' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Entry saved successfully
          </Alert>
        )}

        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <TextField
                label="From (m)"
                type="number"
                value={currentEntry.from || ''}
                onChange={(e) => handleIntervalChange('from', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="To (m)"
                type="number"
                value={currentEntry.to || ''}
                onChange={(e) => handleIntervalChange('to', e.target.value)}
                fullWidth
                required
              />
            </Grid>

            {fields.map((field) => (
              <Grid item xs={12} key={field.name}>
                {field.type === 'domain' ? (
                  <TextField
                    select
                    label={field.name}
                    value={currentEntry.fields?.[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    fullWidth
                    required={field.required}
                  >
                    {field.domain?.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : field.type === 'boolean' ? (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!currentEntry.fields?.[field.name]}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                      />
                    }
                    label={field.name}
                  />
                ) : (
                  <TextField
                    label={field.name}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={currentEntry.fields?.[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    fullWidth
                    required={field.required}
                  />
                )}
              </Grid>
            ))}
          </Grid>

          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Entry'}
            </Button>
          </Box>
        </Paper>

        <Typography variant="h6" gutterBottom>
          Previous Entries
        </Typography>

        <Paper elevation={1}>
          {entries.length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography color="textSecondary">
                No entries yet. Start logging above.
              </Typography>
            </Box>
          ) : (
            <LogEntryList 
              entries={entries} 
              onEdit={handleEdit} 
              onDelete={handleDelete}
              onAddBetween={handleAddBetween}
              onSplit={handleSplitClick}
              onCancelSplit={async (originalEntryId: string) => {
                try {
                  const dbService = DatabaseService.getInstance();
                  
                  // Delete all split entries using the new method
                  await dbService.deleteEntriesByOriginalId(originalEntryId);

                  // Restore original entry
                  const originalEntry = await dbService.getBackupEntry(originalEntryId);
                  if (!originalEntry) {
                    setErrors(['Could not find original entry to restore']);
                    return;
                  }

                  await dbService.addEntry(originalEntry);
                  await loadEntries();

                  setSaveStatus('saved');
                  setTimeout(() => setSaveStatus('idle'), 2000);
                } catch (error) {
                  console.error('Error cancelling split:', error);
                  setErrors(['Failed to cancel split']);
                }
              }}
            />
          )}
        </Paper>

        <Dialog open={showSplitDialog} onClose={handleSplitCancel}>
          <DialogTitle>Confirm Split</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {splitState.originalEntry && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Original Entry: {splitState.originalEntry.from} - {splitState.originalEntry.to}
                  </Typography>
                  <Typography variant="subtitle1" gutterBottom>
                    Will be split into:
                  </Typography>
                  <Typography>
                    Top: {splitState.topEntry?.from} - {splitState.topEntry?.to}
                  </Typography>
                  <Typography>
                    Middle: {splitState.middleEntry?.from} - {splitState.middleEntry?.to}
                  </Typography>
                  <Typography>
                    Bottom: {splitState.bottomEntry?.from} - {splitState.bottomEntry?.to}
                  </Typography>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSplitCancel}>Cancel</Button>
            <Button onClick={handleSplitConfirm} variant="contained">Split</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};
