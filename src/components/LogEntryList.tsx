import React, { useState, useEffect, useCallback } from 'react';
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
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { LogEntry } from '../types';
import databaseService from '../services/DatabaseService';
import csvService from '../services/CSVService';
import { v4 as uuidv4 } from 'uuid';
import { validateIntervals, getIntervalColor, IntervalValidation } from '../utils/intervalUtils';
import DepthEditDialog from './DepthEditDialog';
import historyService, { DepthAdjustmentCommand } from '../services/HistoryService';

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
  const [sortedEntries, setSortedEntries] = useState<LogEntry[]>([]);
  const [depthEditDialog, setDepthEditDialog] = useState<{
    open: boolean;
    type: 'from' | 'to';
    entryId: string;
    currentDepth: number;
    minDepth?: number;
    maxDepth?: number;
  }>({
    open: false,
    type: 'from',
    entryId: '',
    currentDepth: 0
  });

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

  useEffect(() => {
    // Sort entries by depth
    const sorted = [...entries].sort((a, b) => a.from - b.from);
    console.log('[LogEntryList] Sorted entries:', sorted);
    setSortedEntries(sorted);
  }, [entries]);

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

  const handleDepthClick = (entry: LogEntry, type: 'from' | 'to') => {
    const entryIndex = sortedEntries.findIndex(e => e.id === entry.id);
    let minDepth: number | undefined;
    let maxDepth: number | undefined;

    if (type === 'from') {
      // For 'from', min is previous entry's 'to' (if exists)
      if (entryIndex > 0) {
        minDepth = sortedEntries[entryIndex - 1].to;
      }
      // Max is current entry's 'to'
      maxDepth = entry.to;
    } else {
      // For 'to', min is current entry's 'from'
      minDepth = entry.from;
      // Max is next entry's 'from' (if exists)
      if (entryIndex < sortedEntries.length - 1) {
        maxDepth = sortedEntries[entryIndex + 1].from;
      }
    }

    setDepthEditDialog({
      open: true,
      type,
      entryId: entry.id,
      currentDepth: type === 'from' ? entry.from : entry.to,
      minDepth,
      maxDepth
    });
  };

  const handleDepthConfirm = async (newDepth: number) => {
    const entry = entries.find(e => e.id === depthEditDialog.entryId);
    if (!entry) return;

    const entryIndex = sortedEntries.findIndex(e => e.id === entry.id);
    const updatedEntries: LogEntry[] = [];
    const originalEntries: LogEntry[] = [];

    // Add current entry to both lists
    originalEntries.push({ ...entry });
    const updatedEntry = {
      ...entry,
      [depthEditDialog.type]: newDepth
    };
    updatedEntries.push(updatedEntry);

    // If adjusting 'to', update next entry's 'from' if they were connected
    if (depthEditDialog.type === 'to' && entryIndex < sortedEntries.length - 1) {
      const nextEntry = sortedEntries[entryIndex + 1];
      if (Math.abs(entry.to - nextEntry.from) < 0.0001) {
        originalEntries.push({ ...nextEntry });
        updatedEntries.push({
          ...nextEntry,
          from: newDepth
        });
      }
    }
    // If adjusting 'from', update previous entry's 'to' if they were connected
    else if (depthEditDialog.type === 'from' && entryIndex > 0) {
      const prevEntry = sortedEntries[entryIndex - 1];
      if (Math.abs(entry.from - prevEntry.to) < 0.0001) {
        originalEntries.push({ ...prevEntry });
        updatedEntries.push({
          ...prevEntry,
          to: newDepth
        });
      }
    }

    try {
      // Create and execute the depth adjustment command
      const command = new DepthAdjustmentCommand(
        entry.drillhole_id,
        originalEntries,
        updatedEntries
      );
      await historyService.executeCommand(command);
      
      // Update local state
      const newEntries = entries.map(e => {
        const updated = updatedEntries.find(u => u.id === e.id);
        return updated || e;
      });
      setSortedEntries(newEntries);

      // Close the dialog
      setDepthEditDialog(prev => ({ ...prev, open: false }));
    } catch (error) {
      console.error('[LogEntryList] Error updating depths:', error);
      alert(error instanceof Error ? error.message : 'Failed to update depth');
    }
  };

  // Handle undo/redo
  const drillholeId = entries[0]?.drillhole_id;
  const handleUndo = useCallback(async () => {
    try {
      await historyService.undo();
      const updatedEntries = await databaseService.getEntries(drillholeId);
      setSortedEntries(updatedEntries);
    } catch (error) {
      console.error('[LogEntryList] Undo failed:', error);
      alert(error instanceof Error ? error.message : 'Undo failed');
    }
  }, [drillholeId]);

  const handleRedo = useCallback(async () => {
    try {
      await historyService.redo();
      const updatedEntries = await databaseService.getEntries(drillholeId);
      setSortedEntries(updatedEntries);
    } catch (error) {
      console.error('[LogEntryList] Redo failed:', error);
      alert(error instanceof Error ? error.message : 'Redo failed');
    }
  }, [drillholeId]);

  // Register keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!drillholeId) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drillholeId, handleUndo, handleRedo]);

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
    <Box>
      <DepthEditDialog
        open={depthEditDialog.open}
        onClose={() => setDepthEditDialog(prev => ({ ...prev, open: false }))}
        onConfirm={handleDepthConfirm}
        currentDepth={depthEditDialog.currentDepth}
        type={depthEditDialog.type}
        minDepth={depthEditDialog.minDepth}
        maxDepth={depthEditDialog.maxDepth}
      />
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell key="header-from">From</TableCell>
              <TableCell key="header-to">To</TableCell>
              {visibleFields
                .filter(field => !['from', 'to'].includes(field.field_name))
                .map((field) => (
                  <TableCell key={`header-${field.field_name}`}>
                    {field.display_name || field.field_name}
                  </TableCell>
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
                      <Button
                        onClick={() => handleDepthClick(entry, 'from')}
                        variant="text"
                        color="primary"
                        size="small"
                        sx={{ minWidth: 0, p: 0.5 }}
                      >
                        {entry.from}
                      </Button>
                    </TableCell>
                    <TableCell key={`${entry.id}-to`}>
                      <Button
                        onClick={() => handleDepthClick(entry, 'to')}
                        variant="text"
                        color="primary"
                        size="small"
                        sx={{ minWidth: 0, p: 0.5 }}
                      >
                        {entry.to}
                      </Button>
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
    </Box>
  );
};

export default LogEntryList;
