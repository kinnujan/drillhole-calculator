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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import AddIcon from '@mui/icons-material/Add';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CancelIcon from '@mui/icons-material/Cancel';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import { LogEntry } from '../types';
import databaseService from '../services/DatabaseService';
import csvService from '../services/CSVService';
import { v4 as uuidv4 } from 'uuid';
import { validateIntervals, getIntervalColor, IntervalValidation } from '../utils/intervalUtils';

interface Field {
  field_name: string;
  field_type: string;
  page_name: string;
  page_order: number;
  visibility_style: string;
  required?: boolean;
  domain_values?: string[];
  default_value?: string;
  description?: string;
  style_config?: any;
}

interface LogEntryListProps {
  entries: LogEntry[];
  onEdit?: (entry: LogEntry) => void;
  onDelete?: (id: string) => void;
  onAddBetween?: (from: number, to: number) => void;
  onSplit?: (entry: LogEntry) => void;
  onCancelSplit?: (originalEntryId: string) => Promise<void>;
}

const LogEntryList: React.FC<LogEntryListProps> = ({ 
  entries, 
  onEdit, 
  onDelete, 
  onAddBetween, 
  onSplit,
  onCancelSplit
}) => {
  const theme = useTheme();
  const [fields, setFields] = useState<Field[]>([]);
  const [styles, setStyles] = useState<Record<string, any>>({});
  const [intervalValidations, setIntervalValidations] = useState<IntervalValidation[]>([]);

  useEffect(() => {
    console.log('[LogEntryList] Entries updated:', entries);
    // Validate intervals whenever entries change
    const validations = validateIntervals(entries);
    setIntervalValidations(validations);
    console.log('[LogEntryList] Interval validations:', validations);

    const loadData = async () => {
      try {
        console.log('[LogEntryList] Loading configuration data...');
        const config = await csvService.loadConfiguration();
        if (!config) {
          console.error('[LogEntryList] No configuration loaded');
          return;
        }
        console.log('[LogEntryList] Configuration loaded:', config);
        setFields(config);

        // Pre-compute styles for each field value
        const styleMap: Record<string, any> = {};
        config.forEach(field => {
          if (field.style_config) {
            const config = JSON.parse(typeof field.style_config === 'string' ? field.style_config : JSON.stringify(field.style_config));
            if (config.colors || config.icons) {
              styleMap[field.field_name] = config;
            }
          }
        });
        console.log('[LogEntryList] Style map computed:', styleMap);
        setStyles(styleMap);
      } catch (error) {
        console.error('[LogEntryList] Error loading configuration:', error);
      }
    };

    loadData();
  }, [entries]);

  // Sort entries by depth
  const sortedEntries = [...entries].sort((a, b) => a.from - b.from);
  console.log('[LogEntryList] Sorted entries:', sortedEntries);

  const getDisplayValue = (entry: LogEntry, field: Field) => {
    if (!field.field_name) {
      console.warn('[LogEntryList] Field missing name:', field);
      return '';
    }
    
    console.log(`[LogEntryList] Getting display value for field ${field.field_name}:`, entry[field.field_name as keyof LogEntry]);
    const value = entry[field.field_name as keyof LogEntry];
    if (value === undefined || value === null) return '';

    if (field.field_type === 'boolean') {
      return value === true ? 'Yes' : 'No';
    }

    if (field.field_type === 'domain') {
      const style = styles[field.field_name];
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {style?.icons?.[value] && (
            <Typography component="span" sx={{ fontSize: '1.2em' }}>
              {style.icons[value]}
            </Typography>
          )}
          <Typography
            component="span"
            sx={{
              color: style?.colors?.[value] || 'inherit',
              fontWeight: style?.colors?.[value] ? 'bold' : 'inherit'
            }}
          >
            {value}
          </Typography>
        </Box>
      );
    }

    return value.toString();
  };

  const getCellStyle = (field: Field, value: any) => {
    if (!styles[field.field_name] || !value) return {};

    const style = styles[field.field_name];
    const cellStyle = {
      color: style.colors?.[value] || 'inherit',
      backgroundColor: style.background?.[value],
      ...(style.cellStyle?.[value] || {})
    };
    console.log(`[LogEntryList] Cell style for ${field.field_name}:`, cellStyle);
    return cellStyle;
  };

  const handleSplitClick = async (entry: LogEntry) => {
    console.log(`[LogEntryList] Split button clicked for entry:`, entry);
    try {
      await onSplit(entry);
    } catch (error) {
      console.error('[LogEntryList] Error in split handler:', error);
    }
  };

  const handleCancelSplit = async (entryId: string) => {
    console.log(`[LogEntryList] Cancel split clicked for entry:`, entryId);
    if (onCancelSplit) {
      await onCancelSplit(entryId);
    }
  };

  const handleAddBetween = (from: number, to: number) => {
    console.log(`[LogEntryList] Add between clicked:`, { from, to });
    onAddBetween && onAddBetween(from, to);
  };

  const handleEdit = (entry: LogEntry) => {
    console.log(`[LogEntryList] Edit clicked for entry:`, entry);
    onEdit && onEdit(entry);
  };

  const handleDelete = (id: string) => {
    console.log(`[LogEntryList] Delete clicked for entry:`, id);
    onDelete && onDelete(id);
  };

  // Filter out system fields that should be hidden and get unique visible fields
  const visibleFields = fields
    .filter(field => field.visibility_style !== 'hidden')
    .filter((field, index, self) => 
      index === self.findIndex(f => f.field_name === field.field_name)
    )
    .filter(field => field.field_name && field.field_type); // Ensure fields have name and type

  console.log('[LogEntryList] Visible fields:', visibleFields.map(f => ({ 
    name: f.field_name, 
    type: f.field_type,
    visibility: f.visibility_style 
  })));

  // Function to render gap indicator row
  const renderGapIndicator = (gapStart: number, gapEnd: number, index: number) => (
    <TableRow key={`gap-${index}`} sx={{ 
      backgroundColor: theme.palette.mode === 'dark' 
        ? getIntervalColor({ hasGap: true, hasOverlap: false }).dark
        : getIntervalColor({ hasGap: true, hasOverlap: false }).light 
    }}>
      <TableCell colSpan={visibleFields.length + 3} sx={{ py: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="warning.main">
          Gap: {gapStart.toFixed(2)} - {gapEnd.toFixed(2)}
        </Typography>
      </TableCell>
    </TableRow>
  );

  // Function to get row style based on validation
  const getRowStyle = (validation: IntervalValidation) => {
    const prevColors = getIntervalColor(validation.prevStatus);
    const nextColors = getIntervalColor(validation.nextStatus);
    
    const color = prevColors.light !== 'transparent' || nextColors.light !== 'transparent'
      ? theme.palette.mode === 'dark'
        ? prevColors.dark || nextColors.dark
        : prevColors.light || nextColors.light
      : 'transparent';
    
    return {
      backgroundColor: color,
      position: 'relative' as const
    };
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell key="header-from">From</TableCell>
              <TableCell key="header-to">To</TableCell>
              {visibleFields
                .filter(field => !['from', 'to'].includes(field.field_name))
                .map((field) => (
                  <TableCell key={`header-${field.field_name}`}>{field.description || field.field_name}</TableCell>
                ))}
              <TableCell key="header-actions">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Add button at the start */}
            {sortedEntries.length > 0 && (
              <TableRow key="add-start">
                <TableCell colSpan={visibleFields.length + 3} align="center" sx={{ py: 0 }}>
                  <Tooltip title="Add Entry at Start">
                    <IconButton
                      size="small"
                      sx={{ my: 0.5 }}
                      onClick={() => handleAddBetween(0, sortedEntries[0].from)}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )}

            {/* Existing entries with between buttons and gap indicators */}
            {sortedEntries.map((entry, index) => {
              const validation = intervalValidations[index];
              const nextEntry = sortedEntries[index + 1];
              
              return (
                <React.Fragment key={`entry-group-${entry.id}`}>
                  <TableRow sx={validation ? getRowStyle(validation) : undefined}>
                    <TableCell key={`${entry.id}-from`}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {entry.from}
                        {validation?.prevStatus.hasOverlap && (
                          <Tooltip title={`Overlap with previous: ${validation.prevStatus.overlapStart} - ${validation.prevStatus.overlapEnd}`}>
                            <Box component="span" sx={{ ml: 1, color: 'error.main' }}>⚠️</Box>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell key={`${entry.id}-to`}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {entry.to}
                        {validation?.nextStatus.hasOverlap && (
                          <Tooltip title={`Overlap with next: ${validation.nextStatus.overlapStart} - ${validation.nextStatus.overlapEnd}`}>
                            <Box component="span" sx={{ ml: 1, color: 'error.main' }}>⚠️</Box>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    {visibleFields
                      .filter(field => !['from', 'to'].includes(field.field_name))
                      .map((field) => (
                        <TableCell 
                          key={`${entry.id}-${field.field_name}`} 
                          style={getCellStyle(field, entry[field.field_name as keyof LogEntry])}
                        >
                          {getDisplayValue(entry, field)}
                        </TableCell>
                      ))}
                    <TableCell key={`${entry.id}-actions`}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(entry)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleSplitClick(entry)}
                        >
                          <CallSplitIcon />
                        </IconButton>
                        {entry.originalEntryId && onCancelSplit && (
                          <IconButton
                            size="small"
                            onClick={() => handleCancelSplit(entry.originalEntryId!)}
                          >
                            <CancelIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  {/* Add gap indicator if there's a gap between this entry and the next */}
                  {nextEntry && nextEntry.from > entry.to && (
                    renderGapIndicator(entry.to, nextEntry.from, index)
                  )}
                  
                  {/* Add button between entries */}
                  {nextEntry && (
                    <TableRow key={`add-between-${entry.id}`}>
                      <TableCell colSpan={visibleFields.length + 3} align="center" sx={{ py: 0 }}>
                        <Tooltip title="Add Entry Between">
                          <IconButton
                            size="small"
                            sx={{ my: 0.5 }}
                            onClick={() => handleAddBetween(entry.to, nextEntry.from)}
                          >
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default LogEntryList;
