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
import DatabaseService from '../services/DatabaseService';
import CSVService from '../services/CSVService';
import { v4 as uuidv4 } from 'uuid';
import { validateIntervals, getIntervalColor, IntervalValidation } from '../utils/intervalUtils';

interface Field {
  name: string;
  type: string;
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
      const csvService = CSVService.getInstance();
      const config = await csvService.loadConfiguration();
      setFields(config);

      // Pre-compute styles for each field value
      const styleMap: Record<string, any> = {};
      config.forEach(field => {
        if (field.style_config) {
          const config = JSON.parse(typeof field.style_config === 'string' ? field.style_config : JSON.stringify(field.style_config));
          if (config.colors || config.icons) {
            styleMap[field.name] = config;
          }
        }
      });
      setStyles(styleMap);
    };

    loadData();
  }, [entries]);

  // Sort entries by depth
  const sortedEntries = [...entries].sort((a, b) => a.from - b.from);
  console.log('[LogEntryList] Sorted entries:', sortedEntries);

  const getDisplayValue = (entry: LogEntry, field: Field) => {
    const value = entry[field.name as keyof LogEntry];
    if (value === undefined || value === null) return '';

    if (field.type === 'boolean') {
      return value === true ? 'Yes' : 'No';
    }

    if (field.type === 'domain') {
      const style = styles[field.name];
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
    if (!styles[field.name] || !value) return {};

    const style = styles[field.name];
    return {
      color: style.colors?.[value] || 'inherit',
      backgroundColor: style.background?.[value],
      ...(style.cellStyle?.[value] || {})
    };
  };

  const handleSplitClick = async (entry: LogEntry) => {
    console.log(`[UI] Split button clicked for entry:`, entry);
    try {
      await onSplit(entry);
    } catch (error) {
      console.error('[UI] Error in split handler:', error);
    }
  };

  const handleCancelSplit = async (entryId: string) => {
    if (onCancelSplit) {
      await onCancelSplit(entryId);
    }
  };

  // Filter out system fields that should be hidden and get unique visible fields
  const visibleFields = fields
    .filter(field => field.visibility_style !== 'hidden')
    .filter((field, index, self) => 
      index === self.findIndex(f => f.name === field.name)
    );

  // Function to render gap indicator row
  const renderGapIndicator = (gapStart: number, gapEnd: number) => (
    <TableRow sx={{ 
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
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              {visibleFields
                .filter(field => !['from', 'to'].includes(field.name))
                .map((field) => (
                  <TableCell key={field.name}>{field.name}</TableCell>
                ))}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Add button at the start */}
            {sortedEntries.length > 0 && (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 3} align="center" sx={{ py: 0 }}>
                  <Tooltip title="Add Entry at Start">
                    <IconButton
                      size="small"
                      sx={{ my: 0.5 }}
                      onClick={() => onAddBetween && onAddBetween(0, sortedEntries[0].from)}
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
              return (
                <React.Fragment key={entry.id}>
                  <TableRow sx={validation ? getRowStyle(validation) : undefined}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {entry.from}
                        {validation?.prevStatus.hasOverlap && (
                          <Tooltip title={`Overlap with previous: ${validation.prevStatus.overlapStart} - ${validation.prevStatus.overlapEnd}`}>
                            <Box component="span" sx={{ ml: 1, color: 'error.main' }}>⚠️</Box>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
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
                      .filter(field => !['from', 'to'].includes(field.name))
                      .map((field) => (
                        <TableCell key={field.name} style={getCellStyle(field, entry[field.name as keyof LogEntry])}>
                          {getDisplayValue(entry, field)}
                        </TableCell>
                      ))}
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => onEdit && onEdit(entry)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onSplit && onSplit(entry)}
                        >
                          <CallSplitIcon />
                        </IconButton>
                        {entry.originalEntryId && onCancelSplit && (
                          <IconButton
                            size="small"
                            onClick={() => onCancelSplit(entry.originalEntryId!)}
                          >
                            <CancelIcon />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() => onDelete && onDelete(entry.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* Show gap indicator if there's a gap */}
                  {validation?.nextStatus.hasGap && renderGapIndicator(
                    validation.nextStatus.gapStart!,
                    validation.nextStatus.gapEnd!
                  )}

                  {/* Add button between entries */}
                  {onAddBetween && index < sortedEntries.length - 1 && (
                    <TableRow>
                      <TableCell colSpan={visibleFields.length + 3} align="center" sx={{ py: 0 }}>
                        <Tooltip title="Add Entry Between">
                          <IconButton
                            size="small"
                            sx={{ my: 0.5 }}
                            onClick={() =>
                              onAddBetween(entry.to, sortedEntries[index + 1].from)
                            }
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

            {/* Add button at the end */}
            {sortedEntries.length > 0 && (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 3} align="center" sx={{ py: 0 }}>
                  <Tooltip title="Add Entry at End">
                    <IconButton
                      size="small"
                      sx={{ my: 0.5 }}
                      onClick={() => onAddBetween && onAddBetween(sortedEntries[sortedEntries.length - 1].to, sortedEntries[sortedEntries.length - 1].to + 5)}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            )}

            {/* Show message when no entries exist */}
            {sortedEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 3} align="center">
                  <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">No entries yet</Typography>
                    {onAddBetween && (
                      <Tooltip title="Add First Entry">
                        <IconButton
                          size="small"
                          onClick={() => onAddBetween(0, 5)}
                        >
                          <AddIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default LogEntryList;
