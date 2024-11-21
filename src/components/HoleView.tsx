import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Grid,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';
import { DatabaseService } from '../services/DatabaseService';
import { ConfigService } from '../services/ConfigService';
import { LogEntry, LogEntryField } from '../models/LogEntry';
import { QuickLogForm } from './QuickLogForm';
import { StriplogViewer } from './StriplogViewer';

interface HoleViewProps {
  holeid: string;
}

export const HoleView: React.FC<HoleViewProps> = ({ holeid }) => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [fields, setFields] = useState<LogEntryField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);

  useEffect(() => {
    const configService = ConfigService.getInstance();
    setFields(configService.getFields());
    loadEntries();
  }, [holeid]);

  const loadEntries = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const loadedEntries = await dbService.getEntriesByHole(holeid);
      setEntries(loadedEntries);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load entries');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const dbService = DatabaseService.getInstance();
      await dbService.deleteEntry(id);
      await loadEntries();
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete entry');
    }
  };

  const handleEdit = (entry: LogEntry) => {
    setSelectedEntry(entry);
  };

  const renderValue = (entry: LogEntry, field: LogEntryField) => {
    const value = entry.fields[field.name];
    
    if (value === undefined || value === '') {
      return '-';
    }

    switch (field.type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-4">
      <Typography variant="h5" component="h1" gutterBottom>
        Hole: {holeid}
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <QuickLogForm
            holeid={holeid}
            previousEntry={entries[entries.length - 1]}
            onSave={loadEntries}
          />

          <TableContainer component={Paper} className="mt-4">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  {fields.map((field) => (
                    <TableCell key={field.name}>{field.name}</TableCell>
                  ))}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.from}</TableCell>
                    <TableCell>{entry.to}</TableCell>
                    {fields.map((field) => (
                      <TableCell key={field.name}>
                        {renderValue(entry, field)}
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(entry)}
                        title="Edit"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(entry.id)}
                        title="Delete"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12} md={4}>
          <StriplogViewer
            entries={entries}
            onIntervalClick={handleEdit}
            height={800}
          />
        </Grid>
      </Grid>
    </div>
  );
};
