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
  FormHelperText
} from '@mui/material';
import { LogEntry } from '../types';
import { FieldConfig, PageInfo, VisibilityStyle } from '../types/Field';
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
  const [pages, setPages] = useState<PageInfo[]>([]);
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

  useEffect(() => {
    const initialize = async () => {
      console.log('[QuickLogForm] Starting initialization');
      
      try {
        // Load configuration once
        await csvService.loadConfiguration();
        
        // Set pages
        setPages(csvService.getPages());
        
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

  const handleFieldChange = (fieldName: string, value: any) => {
    console.log(`[QuickLogForm] Field change: ${fieldName} =`, value);
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
      modified: new Date()
    }));
    
    // Clear error for this field if it exists
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log(`[QuickLogForm] Tab changed to: ${newValue}`);
    setCurrentTab(newValue);
  };

  const handleQuickFill = () => {
    console.log('[QuickLogForm] Quick fill triggered');
    if (previousEntry && onQuickFill) {
      console.log('[QuickLogForm] Quick filling from previous entry:', previousEntry);
      onQuickFill();
    }
  };

  const renderField = (field: FieldConfig) => {
    console.log(`[QuickLogForm] Rendering field: ${field.field_name}, type: ${field.field_type}`);
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
              onChange={e => handleFieldChange(field.field_name, e.target.value)}
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

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      {/* System fields (non-hidden) */}
      <Box sx={{ mb: 2 }}>
        {csvService.getFieldsForPage('System').map(renderField)}
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
          {csvService.getFieldsForPage(page.name).map(renderField)}
        </TabPanel>
      ))}

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {previousEntry && onQuickFill && (
          <Button
            variant="outlined"
            onClick={handleQuickFill}
            startIcon={<ContentCopyIcon />}
          >
            Quick Fill
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
        >
          Save Entry
        </Button>
      </Box>

      <OverlapDialog
        open={overlapDialogState.open}
        onClose={() => setOverlapDialogState({ open: false, newEntry: null, overlapResult: null })}
        newEntry={overlapDialogState.newEntry!}
        overlapResult={overlapDialogState.overlapResult!}
        onConfirm={handleOverlapConfirm}
      />
    </Box>
  );
};

export default QuickLogForm;
