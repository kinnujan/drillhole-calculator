import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  FormHelperText,
  FormLabel,
  ButtonGroup
} from '@mui/material';
import { LogEntry } from '../types';
import { FieldConfig, type VisibilityStyle, type PageInfo } from '../types/Field';
import csvService from '../services/CSVService';
import { v4 as uuidv4 } from 'uuid';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OverlapDialog from './OverlapDialog';

interface QuickLogFormProps {
  onSubmit: (entry: Omit<LogEntry, 'id'>) => void;
  onCancel?: () => void;
  editEntry?: LogEntry | null;
  drillholeId?: string;
  prefillData?: Partial<LogEntry> | null;
  previousEntry?: LogEntry | null;
  onQuickFill?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const commonStyles = {
  fieldContainer: {
    mb: 3,
    '& .MuiFormLabel-root': {
      fontSize: '0.95rem',
      fontWeight: 500,
      color: 'text.primary',
      mb: 1
    },
    '& .MuiFormHelperText-root': {
      mt: 1,
      fontSize: '0.8rem'
    }
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1,
    mt: 1
  },
  optionButton: {
    minWidth: 120,
    height: 40,
    borderRadius: 1,
    textTransform: 'none',
    fontSize: '0.9rem',
    fontWeight: 500
  },
  hintBadge: {
    position: 'absolute',
    left: -8,
    top: -8,
    bgcolor: 'primary.main',
    color: 'white',
    px: 1,
    py: 0.5,
    borderRadius: 1,
    fontSize: '0.75rem',
    fontWeight: 'bold',
    minWidth: '1.5em',
    textAlign: 'center',
    zIndex: 1,
    boxShadow: 1
  },
  select: {
    '& .MuiSelect-select': {
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      py: 1.5
    }
  },
  menuItem: {
    py: 1.5,
    px: 2,
    minHeight: 'auto',
    '&:hover': {
      backgroundColor: 'action.hover'
    }
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    mr: 1,
    fontSize: '1.1rem'
  },
  pageContainer: {
    p: 3,
    '& .MuiFormControl-root': {
      width: '100%'
    }
  },
  depthContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 1,
    mb: 2,
    '& .MuiFormControl-root': {
      width: 140,
      minWidth: 140
    },
    '& .MuiInputBase-root': {
      height: 40
    },
    '& .MuiInputBase-input': {
      textAlign: 'center',
      py: 1
    }
  },
  depthButtonGroup: {
    height: 40,
    '& .MuiButtonGroup-grouped': {
      minWidth: 48,
      width: 48,
      height: 40,
      fontSize: '0.9rem',
      fontWeight: 500,
      borderColor: 'divider',
      color: 'text.primary',
      backgroundColor: 'background.paper',
      '&:hover': {
        backgroundColor: 'action.hover',
        borderColor: 'divider'
      },
      '&.Mui-disabled': {
        borderColor: 'divider'
      }
    }
  },
  depthHintBadge: {
    position: 'absolute',
    left: '50%',
    top: -16,
    transform: 'translateX(-50%)',
    bgcolor: 'primary.main',
    color: 'white',
    px: 1,
    py: 0.25,
    borderRadius: 1,
    fontSize: '0.75rem',
    fontWeight: 'bold',
    minWidth: '1.5em',
    textAlign: 'center',
    zIndex: 1,
    boxShadow: 1
  }
};

const QuickLogForm: React.FC<QuickLogFormProps> = ({
  onSubmit,
  onCancel,
  editEntry,
  drillholeId,
  prefillData,
  previousEntry,
  onQuickFill
}) => {
  const [formData, setFormData] = useState<Partial<LogEntry>>({});
  const [pages, setPages] = useState<Array<{ name: string }>>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [overlapDialogState, setOverlapDialogState] = useState<{
    open: boolean;
    newEntry: LogEntry | null;
    overlapResult: OverlapResult | null;
  }>({
    open: false,
    newEntry: null,
    overlapResult: null
  });
  const [hintMode, setHintMode] = useState(false);
  const [hintBuffer, setHintBuffer] = useState('');
  const [hintTargets, setHintTargets] = useState<HintTarget[]>([]);
  const [dropdownsOpen, setDropdownsOpen] = useState<Record<string, boolean>>({});

  interface HintTarget {
    type: 'option' | 'depth_adjust';
    fieldName: string;
    value: string;
    amount?: number;
    element?: HTMLElement;
  }

  // Helper function to determine text color based on background color
  const getContrastColor = (hexColor: string) => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  // Generate hints for fields (a-z, then aa-zz if needed)
  const generateHint = (index: number): string => {
    // Skip 'f' as it's reserved for toggling hint mode
    if (index < 5) {  // a-e
      return String.fromCharCode(97 + index);
    } else if (index < 25) { // g-z
      return String.fromCharCode(97 + index + 1);
    }
    
    // For indices >= 25, generate two-letter combinations
    // Adjust the index to account for skipping 'f'
    const adjustedIndex = index - 25;
    const first = Math.floor(adjustedIndex / 25);
    const second = adjustedIndex % 25;
    let firstChar = String.fromCharCode(97 + first);
    let secondChar = String.fromCharCode(97 + second);
    
    // Skip combinations with 'f'
    if (firstChar >= 'f') firstChar = String.fromCharCode(firstChar.charCodeAt(0) + 1);
    if (secondChar >= 'f') secondChar = String.fromCharCode(secondChar.charCodeAt(0) + 1);
    
    return firstChar + secondChar;
  };

  // Get fields for current page
  const getCurrentPageFields = () => {
    if (currentTab < 0 || currentTab >= pages.length) {
      console.warn('[QuickLogForm] Invalid currentTab:', currentTab);
      return [];
    }

    const currentPage = pages[currentTab];
    if (!currentPage) {
      console.warn('[QuickLogForm] No page found for currentTab:', currentTab);
      return [];
    }

    console.log('[QuickLogForm] Getting fields for page:', currentPage.name);
    return csvService.getFields()
      .filter(field => field.page_name === currentPage.name)
      .sort((a, b) => a.page_order - b.page_order);
  };

  // Collect all selectable options when entering hint mode
  const collectHintTargets = () => {
    const targets: HintTarget[] = [];
    
    // Get all fields from the current page
    const currentFields = getCurrentPageFields();
    console.log('[QuickLogForm] Current fields:', currentFields);
    
    if (currentFields.length === 0) {
      console.warn('[QuickLogForm] No fields found for current page');
      return targets;
    }
    
    // Open all dropdowns that need to be open
    const newDropdownsOpen: Record<string, boolean> = {};
    
    currentFields.forEach(field => {
      console.log('[QuickLogForm] Processing field:', field.field_name, field.field_type, field.domain_values);
      
      // Add depth adjustment buttons for from/to fields
      if (field.field_name === 'from' || field.field_name === 'to') {
        const adjustments = [-100, -10, -1, -0.1, 0.1, 1, 10, 100];
        adjustments.forEach(amount => {
          targets.push({
            type: 'depth_adjust',
            fieldName: field.field_name,
            value: `${amount > 0 ? '+' : ''}${amount}`,
            amount: amount
          });
        });
      }
      
      if (field.field_type === 'domain') {
        // Get options for this field
        let options: string[] = [];
        if (field.domain_values) {
          if (typeof field.domain_values === 'string') {
            options = field.domain_values.split(',');
          } else if (Array.isArray(field.domain_values)) {
            options = field.domain_values;
          }
        }
        
        console.log('[QuickLogForm] Field options:', field.field_name, options);
        
        options.forEach(option => {
          const trimmedOption = option.trim();
          if (trimmedOption) {
            targets.push({
              type: 'option',
              fieldName: field.field_name,
              value: trimmedOption
            });
          }
        });
        
        // Only open dropdown if visibility style is dropdown
        if (field.visibility_style === 'dropdown') {
          newDropdownsOpen[field.field_name] = true;
        }
      }
    });
    
    setDropdownsOpen(newDropdownsOpen);
    console.log('[QuickLogForm] Collected hint targets:', targets);
    console.log('[QuickLogForm] Opening dropdowns:', newDropdownsOpen);
    return targets;
  };

  useEffect(() => {
    const initialize = async () => {
      console.log('[QuickLogForm] Starting initialization');
      
      try {
        // Get unique page names from CSV service
        const fields = csvService.getFields();
        const uniquePages = Array.from(new Set(fields.map(f => f.page_name)))
          .filter(name => name !== 'System')
          .map(name => ({ name }));

        console.log('[QuickLogForm] Found pages:', uniquePages);
        setPages(uniquePages);

        // Reset to first tab
        setCurrentTab(0);
      } catch (error) {
        console.error('[QuickLogForm] Error during initialization:', error);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    const initialize = async () => {
      console.log('[QuickLogForm] Starting initialization');
      
      try {
        // Load configuration once
        await csvService.loadConfiguration();
        
        // Set form data
        console.log('[QuickLogForm] Setting form data with:', { editEntry, prefillData, previousEntry });
        
        let newFormData: Partial<LogEntry>;
        
        if (editEntry) {
          newFormData = { ...editEntry };
        } else if (prefillData) {
          newFormData = {
            ...prefillData,
            drillhole_id: drillholeId || '',
            from: Number(prefillData.from ?? (previousEntry ? previousEntry.to : 0)),
            to: Number(prefillData.to ?? (previousEntry ? previousEntry.to + 1 : 1)),
            created: new Date(),
            modified: new Date()
          };
        } else {
          const defaultFrom = Number(previousEntry ? previousEntry.to : 0);
          const defaultTo = Number(previousEntry ? previousEntry.to + 1 : 1);
          newFormData = {
            drillhole_id: drillholeId || '',
            from: defaultFrom,
            to: defaultTo,
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
          };
        }
        
        console.log('[QuickLogForm] Setting new form data:', newFormData);
        setFormData(newFormData);
        
      } catch (error) {
        console.error('[QuickLogForm] Initialization error:', error);
      }
    };

    initialize();

    // Subscribe to configuration changes
    const handleConfigChange = () => {
      setPages(csvService.getPages());
    };
    
    csvService.addConfigurationChangeListener(handleConfigChange);
    return () => {
      csvService.removeConfigurationChangeListener(handleConfigChange);
    };
  }, [editEntry, prefillData, drillholeId, previousEntry]);

  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    console.log('[QuickLogForm] Field change:', {
      field: fieldName,
      newValue: value
    });

    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear any errors for this field
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleDirectClick = (event: React.MouseEvent | React.ChangeEvent, field: FieldConfig, value?: string) => {
    if (hintMode) {
      event.preventDefault();
      event.stopPropagation();
      
      // Find the matching hint target
      const target = hintTargets.find(t => 
        t.fieldName === field.field_name && 
        (t.type === 'depth_adjust' ? t.amount === Number(value) : t.value === value)
      );

      if (target) {
        // First apply the value change
        if (target.type === 'depth_adjust' && target.amount !== undefined) {
          const currentDepth = Number(formData[target.fieldName]) || 0;
          const newDepth = Number((currentDepth + target.amount).toFixed(2));
          handleFieldChange(target.fieldName, newDepth.toString());
        } else {
          handleFieldChange(target.fieldName, target.value);
        }
        
        // Exit hint mode and close any open dropdowns
        setHintMode(false);
        setHintBuffer('');
        setDropdownsOpen({});
      }
    } else {
      // Normal click handling when not in hint mode
      if (field.field_type === 'depth' && value !== undefined) {
        const currentDepth = Number(formData[field.field_name]) || 0;
        const amount = Number(value);
        const newDepth = Number((currentDepth + amount).toFixed(2));
        handleFieldChange(field.field_name, newDepth.toString());
      } else {
        handleFieldChange(field.field_name, value || '');
        // Close dropdown after selection in normal mode too
        if (field.field_type === 'domain') {
          setDropdownsOpen(prev => ({ ...prev, [field.field_name]: false }));
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    console.log('[QuickLogForm] Attempting to submit form data:', formData);
    
    if (!validateForm()) {
      console.warn('[QuickLogForm] Form validation failed:', fieldErrors);
      // Find the first page with an error and switch to it
      const fields = csvService.getFields();
      const errorFields = Object.keys(fieldErrors);
      const firstErrorField = fields.find(f => errorFields.includes(f.field_name));
      if (firstErrorField) {
        const errorPage = pages.findIndex(p => p.name === firstErrorField.page);
        if (errorPage !== -1) {
          setCurrentTab(errorPage);
        }
      }
      return;
    }

    console.log('[QuickLogForm] Form validation passed, submitting entry');
    try {
      const entry: Omit<LogEntry, 'id'> = {
        drillhole_id: drillholeId || '',
        from: Number(formData.from),
        to: Number(formData.to),
        fields: formData.fields || {},
        created: formData.created || new Date(),
        modified: new Date(),
        synced: false,
        lithology: formData.lithology || '',
        color: formData.color || '',
        texture: formData.texture || '',
        minerals: formData.minerals || '',
        mineralized: formData.mineralized || false,
        structures: formData.structures || '',
        notes: formData.notes || ''
      };

      await onSubmit(entry);
    } catch (error) {
      console.error('[QuickLogForm] Error submitting form:', error);
      if (error instanceof Error && error.message === 'OVERLAP_DETECTED') {
        // Let the overlap dialog handle this case
        console.log('[QuickLogForm] Overlap detected, dialog will handle');
      } else {
        // Handle other errors
        setFieldErrors(prev => ({
          ...prev,
          submit: `Failed to save entry: ${error instanceof Error ? error.message : 'Unknown error'}`
        }));
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key
      if (e.key === 'Escape') {
        if (hintMode) {
          e.preventDefault();
          exitHintMode();
        } else if (onCancel) {
          e.preventDefault();
          onCancel();
        }
        return;
      }

      // Enter f-mode
      if (e.key === 'f' && !e.ctrlKey && !e.altKey && !e.metaKey && !hintMode) {
        e.preventDefault();
        setHintMode(true);
        setHintBuffer('');
        const targets = collectHintTargets();
        setHintTargets(targets);
        return;
      }

      // Handle hint selection in hint mode
      if (hintMode) {
        e.preventDefault();
        const newBuffer = hintBuffer + e.key.toLowerCase();
        setHintBuffer(newBuffer);

        // Find matching hint
        const matchingTarget = hintTargets.find((target, index) => {
          const hint = generateHint(index);
          return hint === newBuffer;
        });

        if (matchingTarget) {
          selectOption(matchingTarget);
          exitHintMode();
        } else {
          // Check if this could still match any hints
          const couldMatch = hintTargets.some((target, index) => {
            const hint = generateHint(index);
            return hint.startsWith(newBuffer);
          });

          if (!couldMatch) {
            exitHintMode();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hintMode, hintBuffer, hintTargets, onCancel]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const fields = csvService.getFields();
    
    // Check required fields
    fields.forEach(field => {
      if (field.required && !formData[field.field_name as keyof LogEntry]) {
        errors[field.field_name] = `${field.description} is required`;
      }
    });

    // Validate from/to values
    const fromValue = Number(formData.from);
    const toValue = Number(formData.to);
    
    if (isNaN(fromValue)) {
      errors['from'] = 'From depth is required and must be a number';
    }
    if (isNaN(toValue)) {
      errors['to'] = 'To depth is required and must be a number';
    }
    if (!isNaN(fromValue) && !isNaN(toValue) && fromValue >= toValue) {
      errors['to'] = 'To depth must be greater than From depth';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOverlapDetection = (type: string, data: any) => {
    if (type === 'overlap' && data.newEntry && data.overlapResult) {
      setOverlapDialogState({
        open: true,
        newEntry: data.newEntry,
        overlapResult: data.overlapResult
      });
    }
  };

  const handleOverlapConfirm = async (action: 'split' | 'replace' | 'cancel') => {
    if (!overlapDialogState.newEntry || !overlapDialogState.overlapResult?.overlappingEntries.length) {
      return;
    }

    try {
      if (action === 'cancel') {
        setOverlapDialogState({ open: false, newEntry: null, overlapResult: null });
        return;
      }

      const dbService = await import('../services/DatabaseService').then(m => m.default);
      await dbService.handleOverlap(
        overlapDialogState.newEntry,
        overlapDialogState.overlapResult.overlappingEntries[0],
        action
      );
      setOverlapDialogState({ open: false, newEntry: null, overlapResult: null });
      
      // Only clear form if the overlap was handled successfully
      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      console.error('[QuickLogForm] Error handling overlap:', error);
      setFieldErrors(prev => ({
        ...prev,
        submit: `Failed to handle overlap: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const field = event.target.name;
    const value = event.target.type === 'checkbox' ? 
      (event.target as HTMLInputElement).checked : 
      event.target.value;

    handleFieldChange(field, value);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log('[QuickLogForm] Tab changed to:', newValue);
    if (newValue >= 0 && newValue < pages.length) {
      setCurrentTab(newValue);
    } else {
      console.warn('[QuickLogForm] Invalid tab index:', newValue);
    }
  };

  const handleQuickFill = () => {
    console.log('[QuickLogForm] Quick fill triggered');
    if (previousEntry && onQuickFill) {
      console.log('[QuickLogForm] Quick filling from previous entry:', previousEntry);
      onQuickFill();
    }
  };

  const handleChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.MouseEvent<HTMLElement> | null,
    newValue?: string | boolean | null
  ) => {
    console.log('[QuickLogForm] Field change:', { field, event, newValue });
    let value = newValue;
    
    // Handle different event types
    if (event?.target instanceof HTMLInputElement || event?.target instanceof HTMLTextAreaElement) {
      value = event.target.type === 'checkbox' ? 
        (event.target as HTMLInputElement).checked : 
        event.target.value;
    }
    
    if (value !== null && value !== undefined) {
      // Convert numeric fields to numbers
      if (field === 'from' || field === 'to') {
        value = Number(value);
      }
      
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const renderField = (field: FieldConfig) => {
    // Skip hidden fields and drillhole_id
    if (field.visibility_style === 'hidden' || field.field_name === 'drillhole_id') {
      return null;
    }

    // Handle domain fields with button or dropdown style
    if (field.field_type === 'domain') {
      const options = field.domain_values || [];
      const currentValue = formData[field.field_name as keyof LogEntry];

      // Render as buttons if specified
      if (field.visibility_style === 'buttons') {
        return (
          <Box key={field.field_name} sx={commonStyles.fieldContainer}>
            <FormControl error={!!fieldErrors[field.field_name]}>
              <FormLabel component="legend">{field.description}</FormLabel>
              <Box sx={commonStyles.buttonGroup}>
                {options.map((option) => {
                  const trimmedOption = option.trim();
                  if (!trimmedOption) return null;

                  const hint = hintMode ? generateHint(
                    hintTargets.findIndex(t => 
                      t.fieldName === field.field_name && t.value === trimmedOption
                    )
                  ) : null;

                  let styleConfig = {};
                  try {
                    if (typeof field.style_config === 'string') {
                      // Handle string input from CSV
                      const rawConfig = field.style_config || '{}';
                      const cleanConfig = rawConfig.replace(/^"(.*)"$/, '$1').replace(/\\/g, '');
                      styleConfig = JSON.parse(cleanConfig);
                    } else if (field.style_config && typeof field.style_config === 'object') {
                      // Already an object, use directly
                      styleConfig = field.style_config;
                    }
                  } catch (error) {
                    console.error('Failed to parse style config:', error);
                    console.debug('Raw style_config:', field.style_config);
                  }
                  
                  const color = styleConfig?.colors?.[trimmedOption];
                  const icon = styleConfig?.icons?.[trimmedOption];

                  return (
                    <Button
                      key={trimmedOption}
                      variant={currentValue === trimmedOption ? "contained" : "outlined"}
                      onClick={(e) => handleDirectClick(e, field, trimmedOption)}
                      sx={{ 
                        ...commonStyles.optionButton,
                        ...(color && {
                          backgroundColor: currentValue === trimmedOption ? color : 'transparent',
                          borderColor: color,
                          color: currentValue === trimmedOption ? getContrastColor(color) : color,
                          '&:hover': {
                            backgroundColor: currentValue === trimmedOption ? color : `${color}22`,
                            borderColor: color
                          }
                        })
                      }}
                    >
                      {hintMode && hint && (
                        <Box sx={commonStyles.hintBadge}>
                          {hint}
                        </Box>
                      )}
                      {icon && <Box component="span" sx={commonStyles.icon}>{icon}</Box>}
                      {trimmedOption}
                    </Button>
                  );
                })}
              </Box>
              {fieldErrors[field.field_name] && (
                <FormHelperText error>{fieldErrors[field.field_name]}</FormHelperText>
              )}
            </FormControl>
          </Box>
        );
      } else {
        // Render as dropdown for other visibility styles
        const currentValue = formData[field.field_name as keyof LogEntry];
        const isOpen = dropdownsOpen[field.field_name] || false;

        return (
          <Box key={field.field_name} sx={commonStyles.fieldContainer}>
            <FormControl fullWidth error={!!fieldErrors[field.field_name]}>
              <InputLabel>{field.description}</InputLabel>
              <Select
                name={field.field_name}
                value={currentValue || ''}
                onChange={e => handleDirectClick(e as any, field, e.target.value)}
                label={field.description}
                open={isOpen}
                onOpen={() => setDropdownsOpen(prev => ({ ...prev, [field.field_name]: true }))}
                onClose={() => !hintMode && setDropdownsOpen(prev => ({ ...prev, [field.field_name]: false }))}
                sx={commonStyles.select}
              >
                {options.map((option) => {
                  const trimmedOption = option.trim();
                  if (!trimmedOption) return null;

                  const hint = hintMode ? generateHint(
                    hintTargets.findIndex(t => 
                      t.fieldName === field.field_name && t.value === trimmedOption
                    )
                  ) : null;

                  let styleConfig = {};
                  try {
                    if (typeof field.style_config === 'string') {
                      // Handle string input from CSV
                      const rawConfig = field.style_config || '{}';
                      const cleanConfig = rawConfig.replace(/^"(.*)"$/, '$1').replace(/\\/g, '');
                      styleConfig = JSON.parse(cleanConfig);
                    } else if (field.style_config && typeof field.style_config === 'object') {
                      // Already an object, use directly
                      styleConfig = field.style_config;
                    }
                  } catch (error) {
                    console.error('Failed to parse style config:', error);
                    console.debug('Raw style_config:', field.style_config);
                  }
                  
                  const color = styleConfig?.colors?.[trimmedOption];
                  const icon = styleConfig?.icons?.[trimmedOption];

                  return (
                    <MenuItem 
                      key={trimmedOption} 
                      value={trimmedOption}
                      sx={commonStyles.menuItem}
                    >
                      {hintMode && hint && (
                        <Box sx={commonStyles.hintBadge}>
                          {hint}
                        </Box>
                      )}
                      {icon && <Box component="span" sx={commonStyles.icon}>{icon}</Box>}
                      {trimmedOption}
                    </MenuItem>
                  );
                })}
              </Select>
              {fieldErrors[field.field_name] && (
                <FormHelperText error>{fieldErrors[field.field_name]}</FormHelperText>
              )}
            </FormControl>
          </Box>
        );
      }
    }

    // Special handling for depth fields (from/to)
    if (field.field_name === 'from' || field.field_name === 'to') {
      const currentDepth = Number(formData[field.field_name]) || 0;
      const adjustDepth = (amount: number) => {
        const newDepth = Number((currentDepth + amount).toFixed(2));
        handleFieldChange(field.field_name, newDepth.toString());
      };

      const renderDepthButton = (amount: number) => {
        const hint = hintMode ? generateHint(
          hintTargets.findIndex(t => 
            t.type === 'depth_adjust' && 
            t.fieldName === field.field_name && 
            t.amount === amount
          )
        ) : null;

        return (
          <Button 
            onClick={() => adjustDepth(amount)}
            sx={{ 
              position: 'relative',
              minWidth: 48,
              width: 48,
              height: 40
            }}
          >
            {hintMode && hint && (
              <Box sx={commonStyles.depthHintBadge}>
                {hint}
              </Box>
            )}
            {amount > 0 ? `+${amount}` : amount}
          </Button>
        );
      };

      return (
        <Box sx={commonStyles.depthContainer}>
          <ButtonGroup 
            size="small" 
            variant="outlined"
            sx={commonStyles.depthButtonGroup}
          >
            {renderDepthButton(-100)}
            {renderDepthButton(-10)}
            {renderDepthButton(-1)}
            {renderDepthButton(-0.1)}
          </ButtonGroup>

          <FormControl error={!!fieldErrors[field.field_name]}>
            <TextField
              name={field.field_name}
              type="number"
              label={field.field_name === 'from' ? 'From' : 'To'}
              value={formData[field.field_name as keyof LogEntry] || ''}
              onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
              error={!!fieldErrors[field.field_name]}
              helperText={fieldErrors[field.field_name]}
              inputProps={{
                step: 0.1,
                min: 0,
                style: { textAlign: 'center' }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1
                }
              }}
            />
          </FormControl>

          <ButtonGroup 
            size="small" 
            variant="outlined"
            sx={commonStyles.depthButtonGroup}
          >
            {renderDepthButton(0.1)}
            {renderDepthButton(1)}
            {renderDepthButton(10)}
            {renderDepthButton(100)}
          </ButtonGroup>
        </Box>
      );
    }

    // For regular text and number fields
    if (field.field_type === 'text' || field.field_type === 'number') {
      return (
        <Box key={field.field_name} sx={{ mb: 2 }}>
          <FormControl fullWidth error={!!fieldErrors[field.field_name]}>
            <TextField
              label={field.description}
              name={field.field_name}
              type={field.field_type === 'number' ? 'number' : 'text'}
              value={formData[field.field_name as keyof LogEntry] || ''}
              onChange={handleInputChange}
              required={field.required}
              error={!!fieldErrors[field.field_name]}
              helperText={fieldErrors[field.field_name]}
            />
          </FormControl>
        </Box>
      );
    }

    // Handle other field types
    if (field.visibility_style === 'hidden') {
      return null;
    }

    const hasError = submitAttempted && !!fieldErrors[field.field_name];
    const errorMessage = fieldErrors[field.field_name];

    switch (field.visibility_style) {
      case 'buttons':
        return (
          <Box key={field.field_name} sx={{ mb: 2 }}>
            <InputLabel error={hasError}>{field.description}</InputLabel>
            <ToggleButtonGroup
              value={formData[field.field_name] || ''}
              exclusive
              onChange={(e, value) => handleFieldChange(field.field_name, value)}
              aria-label={field.description}
              sx={{
                mt: 1,
                flexWrap: 'wrap',
                gap: 1,
                '& .MuiToggleButton-root': {
                  flex: '1 0 auto',
                  minWidth: '120px',
                  maxWidth: '200px',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.2s ease-in-out',
                  },
                  '&.Mui-selected::after': {
                    backgroundColor: '#1976d2',
                  },
                },
              }}
            >
              {field.domain_values.map(value => {
                const style = field.style_config?.colors?.[value] 
                  ? {
                      backgroundColor: field.style_config.colors[value],
                      color: '#fff',
                      '&.Mui-selected': {
                        backgroundColor: field.style_config.colors[value],
                        filter: 'brightness(0.9)',
                      },
                      '&:hover': {
                        filter: 'brightness(0.95)',
                      },
                    }
                  : {};
                const icon = field.style_config?.icons?.[value];
                return (
                  <ToggleButton 
                    key={value} 
                    value={value}
                    sx={{
                      ...style,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      padding: '8px 16px',
                      '&.Mui-selected': {
                        ...style['&.Mui-selected'],
                        fontWeight: 'bold',
                        transform: 'scale(1.02)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {icon && (
                      <Box component="span" sx={{ fontSize: '1.2em' }}>
                        {icon}
                      </Box>
                    )}
                    <Box component="span">
                      {value}
                    </Box>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
            {hasError && <FormHelperText error>{errorMessage}</FormHelperText>}
          </Box>
        );

      case 'dropdown':
        return (
          <FormControl fullWidth key={field.field_name} margin="normal" error={hasError}>
            <InputLabel>{field.description}</InputLabel>
            <Select
              value={formData[field.field_name] || ''}
              onChange={e => handleDirectClick(e as any, field, e.target.value)}
              label={field.description}
              required={field.required}
              sx={{
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                  borderWidth: '2px',
                },
              }}
            >
              {field.domain_values.map(value => {
                const style = field.style_config?.colors?.[value]
                  ? {
                      color: field.style_config.colors[value],
                      fontWeight: 'bold',
                    }
                  : {};
                const icon = field.style_config?.icons?.[value];
                return (
                  <MenuItem
                    key={value}
                    value={value}
                    sx={{
                      ...style,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                      },
                    }}
                  >
                    {icon && (
                      <Box component="span" sx={{ fontSize: '1.2em' }}>
                        {icon}
                      </Box>
                    )}
                    {value}
                  </MenuItem>
                );
              })}
            </Select>
            {hasError && <FormHelperText>{errorMessage}</FormHelperText>}
          </FormControl>
        );

      case 'switch':
        return (
          <FormControlLabel
            key={field.field_name}
            control={
              <Switch
                checked={formData[field.field_name] || false}
                onChange={e => handleFieldChange(field.field_name, e.target.checked)}
                sx={{
                  '& .MuiSwitch-thumb': {
                    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
                  },
                  '& .MuiSwitch-track': {
                    opacity: 0.8,
                  },
                }}
              />
            }
            label={field.description}
            sx={{
              marginLeft: 0,
              marginRight: 0,
              '& .MuiFormControlLabel-label': {
                color: hasError ? 'error.main' : 'text.primary',
              },
            }}
          />
        );

      case 'textarea':
        return (
          <TextField
            key={field.field_name}
            fullWidth
            multiline
            rows={4}
            label={field.description}
            value={formData[field.field_name] || ''}
            onChange={e => handleFieldChange(field.field_name, e.target.value)}
            required={field.required}
            margin="normal"
            error={hasError}
            helperText={errorMessage}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#1976d2',
              },
            }}
          />
        );

      case 'visible':
      default:
        return (
          <TextField
            key={field.field_name}
            fullWidth
            label={field.description}
            type={field.field_type === 'number' ? 'number' : 'text'}
            value={formData[field.field_name] || ''}
            onChange={e => handleFieldChange(field.field_name, e.target.value)}
            required={field.required}
            margin="normal"
            error={hasError}
            helperText={errorMessage}
            inputProps={{ step: 'any' }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                  borderWidth: '2px',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#1976d2',
              },
            }}
          />
        );
    }
  };

  const renderFieldWithHints = (field: FieldConfig) => {
    if (field.field_type === 'domain') {
      let options: string[] = [];
      if (field.domain_values) {
        if (typeof field.domain_values === 'string') {
          options = field.domain_values.split(',');
        } else if (Array.isArray(field.domain_values)) {
          options = field.domain_values;
        }
      }

      console.log('[QuickLogForm] Rendering field with options:', field.field_name, options);
      
      // Render as buttons if visibility_style is 'buttons'
      if (field.visibility_style === 'buttons') {
        return (
          <Box key={field.field_name} sx={commonStyles.fieldContainer}>
            <FormControl fullWidth error={!!fieldErrors[field.field_name]} component="fieldset">
              <FormLabel component="legend">{field.description}</FormLabel>
              <Box sx={commonStyles.buttonGroup}>
                {options.map((option, optionIndex) => {
                  const trimmedOption = option.trim();
                  if (!trimmedOption) return null;

                  const hint = hintMode ? generateHint(
                    hintTargets.findIndex(t => 
                      t.fieldName === field.field_name && t.value === trimmedOption
                    )
                  ) : null;

                  let styleConfig = {};
                  try {
                    if (typeof field.style_config === 'string') {
                      // Handle string input from CSV
                      const rawConfig = field.style_config || '{}';
                      const cleanConfig = rawConfig.replace(/^"(.*)"$/, '$1').replace(/\\/g, '');
                      styleConfig = JSON.parse(cleanConfig);
                    } else if (field.style_config && typeof field.style_config === 'object') {
                      // Already an object, use directly
                      styleConfig = field.style_config;
                    }
                  } catch (error) {
                    console.error('Failed to parse style config:', error);
                    console.debug('Raw style_config:', field.style_config);
                  }
                  
                  const color = styleConfig?.colors?.[trimmedOption];
                  const icon = styleConfig?.icons?.[trimmedOption];

                  return (
                    <Button
                      key={trimmedOption}
                      variant={formData[field.field_name as keyof LogEntry] === trimmedOption ? "contained" : "outlined"}
                      onClick={(e) => handleDirectClick(e, field, trimmedOption)}
                      sx={{ 
                        position: 'relative',
                        minWidth: 100,
                        height: 36
                      }}
                    >
                      {hintMode && hint && (
                        <Box sx={commonStyles.hintBadge}>
                          {hint}
                        </Box>
                      )}
                      {icon && <Box component="span" sx={commonStyles.icon}>{icon}</Box>}
                      {trimmedOption}
                    </Button>
                  );
                })}
              </Box>
              {fieldErrors[field.field_name] && (
                <FormHelperText>{fieldErrors[field.field_name]}</FormHelperText>
              )}
            </FormControl>
          </Box>
        );
      }

      // Render as dropdown for other visibility styles
      const currentValue = formData[field.field_name as keyof LogEntry];
      const isOpen = dropdownsOpen[field.field_name] || false;

      return (
        <Box key={field.field_name} sx={commonStyles.fieldContainer}>
          <FormControl fullWidth error={!!fieldErrors[field.field_name]}>
            <InputLabel>{field.description}</InputLabel>
            <Select
              name={field.field_name}
              value={currentValue || ''}
              onChange={e => handleDirectClick(e as any, field, e.target.value)}
              label={field.description}
              open={isOpen}
              onOpen={() => setDropdownsOpen(prev => ({ ...prev, [field.field_name]: true }))}
              onClose={() => !hintMode && setDropdownsOpen(prev => ({ ...prev, [field.field_name]: false }))}
              sx={commonStyles.select}
            >
              {options.map((option, optionIndex) => {
                const trimmedOption = option.trim();
                if (!trimmedOption) return null;

                const hint = hintMode ? generateHint(
                  hintTargets.findIndex(t => 
                    t.fieldName === field.field_name && t.value === trimmedOption
                  )
                ) : null;

                let styleConfig = {};
                try {
                  if (typeof field.style_config === 'string') {
                    // Handle string input from CSV
                    const rawConfig = field.style_config || '{}';
                    const cleanConfig = rawConfig.replace(/^"(.*)"$/, '$1').replace(/\\/g, '');
                    styleConfig = JSON.parse(cleanConfig);
                  } else if (field.style_config && typeof field.style_config === 'object') {
                    // Already an object, use directly
                    styleConfig = field.style_config;
                  }
                } catch (error) {
                  console.error('Failed to parse style config:', error);
                  console.debug('Raw style_config:', field.style_config);
                }
                
                const color = styleConfig?.colors?.[trimmedOption];
                const icon = styleConfig?.icons?.[trimmedOption];

                return (
                  <MenuItem 
                    key={trimmedOption} 
                    value={trimmedOption}
                    sx={commonStyles.menuItem}
                  >
                    {hintMode && hint && (
                      <Box sx={commonStyles.hintBadge}>
                        {hint}
                      </Box>
                    )}
                    {icon && <Box component="span" sx={commonStyles.icon}>{icon}</Box>}
                    {trimmedOption}
                  </MenuItem>
                );
              })}
            </Select>
            {fieldErrors[field.field_name] && (
              <FormHelperText error>{fieldErrors[field.field_name]}</FormHelperText>
            )}
          </FormControl>
        </Box>
      );
    }
    
    return renderField(field);
  };

  const selectOption = (target: HintTarget) => {
    console.log('[QuickLogForm] Selecting option:', target);

    if (target.type === 'depth_adjust' && target.amount !== undefined) {
      const currentDepth = Number(formData[target.fieldName]) || 0;
      const newDepth = Number((currentDepth + target.amount).toFixed(2));
      handleFieldChange(target.fieldName, newDepth.toString());
    } else {
      // Update form data
      setFormData(prev => ({
        ...prev,
        [target.fieldName]: target.value
      }));
    }

    // Close all dropdowns
    setDropdownsOpen({});

    // Move focus to next field
    const currentFields = getCurrentPageFields();
    const currentFieldIndex = currentFields.findIndex(f => f.field_name === target.fieldName);
    if (currentFieldIndex !== -1 && currentFieldIndex < currentFields.length - 1) {
      const nextField = currentFields[currentFieldIndex + 1];
      const nextElement = document.querySelector(`[name="${nextField.field_name}"]`) as HTMLElement;
      if (nextElement) {
        nextElement.focus();
      }
    }

    // If this was the last field, move to next page
    if (currentFieldIndex === currentFields.length - 1) {
      const nextTab = currentTab + 1;
      if (nextTab < pages.length) {
        setCurrentTab(nextTab);
      }
    }
  };

  const exitHintMode = () => {
    setHintMode(false);
    setHintBuffer('');
    setHintTargets([]);
    setDropdownsOpen({});
  };

  const renderPage = (pageIndex: number) => {
    const fields = csvService.getFields()
      .filter(field => 
        field.page_name === pages[pageIndex]?.name && 
        field.field_name !== 'drillhole_id'  // Explicitly exclude drillhole_id
      );

    return (
      <Box sx={commonStyles.pageContainer}>
        {fields.map(field => renderField(field))}
      </Box>
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      {/* System fields (non-hidden) */}
      <Box sx={{ mb: 2 }}>
        {csvService.getFieldsForPage('System')
          .filter(field => field.field_name !== 'drillhole_id')
          .map(field => renderField(field))
        }
      </Box>

      {/* Tabs for other pages */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          {pages.filter(page => page.name !== 'System').map((page, index) => (
            <Tab key={page.name} label={page.name} id={`simple-tab-${index}`} />
          ))}
        </Tabs>
      </Box>

      {pages.filter(page => page.name !== 'System').map((page, index) => (
        <TabPanel key={page.name} value={currentTab} index={index}>
          {renderPage(index)}
        </TabPanel>
      ))}

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        <Box>
          {previousEntry && onQuickFill && (
            <Button
              variant="outlined"
              onClick={handleQuickFill}
              startIcon={<ContentCopyIcon />}
            >
              Quick Fill
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button onClick={onCancel} variant="outlined">
            Cancel (Esc)
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
          >
            Save Entry (Ctrl+Enter)
          </Button>
        </Box>
      </Box>

      <OverlapDialog
        open={overlapDialogState.open}
        newEntry={overlapDialogState.newEntry}
        overlapResult={overlapDialogState.overlapResult}
        onClose={() => setOverlapDialogState({ open: false, newEntry: null, overlapResult: null })}
        onConfirm={handleOverlapConfirm}
      />
    </Box>
  );
};

export default QuickLogForm;
