import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { LogEntry, LogEntryField, LogEntryManager } from '../models/LogEntry';
import { ConfigService } from '../services/ConfigService';
import { DatabaseService } from '../services/DatabaseService';

interface QuickLogInterfaceProps {
  holeid: string;
}

export const QuickLogInterface: React.FC<QuickLogInterfaceProps> = ({ holeid }) => {
  const [fields, setFields] = useState<LogEntryField[]>([]);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<Partial<LogEntry>>({
    holeid,
    fields: {},
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadConfiguration();
    loadEntries();
  }, [holeid]);

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
      
      // Set initial from value based on last entry
      if (holeEntries.length > 0) {
        const lastEntry = holeEntries[holeEntries.length - 1];
        setCurrentEntry(prev => ({
          ...prev,
          from: lastEntry.to,
        }));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading entries:', error);
      setErrors(['Failed to load entries']);
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string | number | boolean) => {
    setCurrentEntry(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: value,
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
    if (!isNaN(numValue)) {
      setCurrentEntry(prev => ({
        ...prev,
        [field]: numValue,
      }));
    }
  };

  const validateEntry = (): string[] => {
    const errors: string[] = [];

    // Validate required fields
    if (!currentEntry.from || !currentEntry.to) {
      errors.push('From and To depths are required');
    }

    if (currentEntry.from !== undefined && currentEntry.to !== undefined) {
      if (currentEntry.from >= currentEntry.to) {
        errors.push('From depth must be less than To depth');
      }

      // Validate interval continuity
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        if (currentEntry.from !== lastEntry.to) {
          errors.push('Interval must be continuous with previous entry');
        }
      }
    }

    // Validate fields
    if (currentEntry.fields) {
      const fieldErrors = LogEntryManager.validateFields(currentEntry as LogEntry, fields);
      errors.push(...fieldErrors);
    }

    return errors;
  };

  // Auto-save timer
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const handleSave = async (isAutoSave: boolean = false) => {
    const validationErrors = validateEntry();
    if (validationErrors.length > 0) {
      if (!isAutoSave) {
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
      setCurrentEntry({
        holeid,
        from: entry.to,
        fields: {},
      });
      await loadEntries();
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving entry:', error);
      setSaveStatus('error');
      setErrors(['Failed to save entry']);
    }
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
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: 16 }}>From (m)</th>
                    <th style={{ padding: 16 }}>To (m)</th>
                    {fields.map((field) => (
                      <th key={field.name} style={{ padding: 16 }}>
                        {field.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ padding: 16, textAlign: 'center' }}>{entry.from}</td>
                      <td style={{ padding: 16, textAlign: 'center' }}>{entry.to}</td>
                      {fields.map((field) => (
                        <td key={field.name} style={{ padding: 16, textAlign: 'center' }}>
                          {entry.fields[field.name]?.toString() || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};
