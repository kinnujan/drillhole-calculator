import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { LogEntry } from '../types';
import DatabaseService from '../services/DatabaseService';
import CSVService from '../services/CSVService';
import { FieldConfig } from '../services/CSVService';

interface LogEntryListProps {
  entries: LogEntry[];
  onEdit: (entry: LogEntry) => void;
  onDelete: (entry: LogEntry) => void;
}

const LogEntryList: React.FC<LogEntryListProps> = ({ entries, onEdit, onDelete }) => {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [styles, setStyles] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadData = async () => {
      const csvService = CSVService.getInstance();
      
      await csvService.loadConfiguration();
      const config = csvService.getConfiguration();
      setFields(config);

      // Pre-compute styles for each field value
      const styleMap: Record<string, any> = {};
      config.forEach(field => {
        if (field.style_config) {
          styleMap[field.field_name] = {};
          if (field.domain_values) {
            field.domain_values.forEach(value => {
              styleMap[field.field_name][value] = csvService.getFieldStyle(field.field_name, value);
            });
          }
        }
      });
      setStyles(styleMap);
    };

    loadData();
  }, []);

  const getDisplayValue = (entry: LogEntry, field: FieldConfig) => {
    const value = entry[field.field_name as keyof LogEntry];
    
    if (field.field_type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (field.field_type === 'domain' && styles[field.field_name]?.[value as string]) {
      const style = styles[field.field_name][value as string];
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {style.icon && <span>{style.icon}</span>}
          <span style={{ color: style.color }}>{value}</span>
        </Box>
      );
    }

    return value || '';
  };

  return (
    <Paper elevation={3}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Actions</TableCell>
              {fields.map(field => (
                <TableCell key={field.field_name}>
                  <Tooltip title={field.description}>
                    <Typography variant="subtitle2">
                      {field.field_name}
                    </Typography>
                  </Tooltip>
                </TableCell>
              ))}
              <TableCell>Sync Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <IconButton size="small" onClick={() => onEdit(entry)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(entry)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
                {fields.map(field => (
                  <TableCell key={field.field_name}>
                    {getDisplayValue(entry, field)}
                  </TableCell>
                ))}
                <TableCell>
                  {entry.synced ? (
                    <Tooltip title="Synced">
                      <CloudDoneIcon color="success" />
                    </Tooltip>
                  ) : (
                    <Tooltip title="Not synced">
                      <CloudOffIcon color="warning" />
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default LogEntryList;
