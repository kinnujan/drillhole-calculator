import React from 'react';
import { List, ListItem, ListItemText, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { LogEntry } from '../models/LogEntry';

interface LogEntryListProps {
  entries: LogEntry[];
  isLoading: boolean;
  error?: string;
}

export const LogEntryList: React.FC<LogEntryListProps> = ({ entries, isLoading, error }) => {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (entries.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="textSecondary">
          No entries found. Start logging to see your data here.
        </Typography>
      </Box>
    );
  }

  // Group entries by holeid
  const holeGroups = entries.reduce((groups, entry) => {
    const group = groups[entry.holeid] || { entries: [], totalDepth: 0 };
    group.entries.push(entry);
    group.totalDepth = Math.max(group.totalDepth, entry.to || 0);
    groups[entry.holeid] = group;
    return groups;
  }, {} as Record<string, { entries: LogEntry[], totalDepth: number }>);

  return (
    <List>
      {Object.entries(holeGroups).map(([holeid, group]) => (
        <ListItem
          key={holeid}
          divider
          button
          onClick={() => {/* TODO: Navigate to hole details */}}
        >
          <ListItemText
            primary={holeid}
            secondary={`${group.entries.length} intervals | Total Depth: ${group.totalDepth}m`}
          />
        </ListItem>
      ))}
    </List>
  );
};
