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
} from '@mui/material';
import { LogEntry } from '../types';
import CSVService, { FieldConfig, PageInfo, VisibilityStyle } from '../services/CSVService';
import { v4 as uuidv4 } from 'uuid';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface QuickLogFormProps {
  onSubmit: (entry: Omit<LogEntry, 'id'>) => void;
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

export default function QuickLogForm({ onSubmit, editEntry, drillholeId, prefillData, previousEntry, onQuickFill }: QuickLogFormProps) {
  const [formData, setFormData] = useState<Partial<LogEntry>>({});
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const csvService = CSVService.getInstance();

  useEffect(() => {
    console.log('[QuickLogForm] Initializing form data with:', { editEntry, prefillData });
    if (editEntry) {
      setFormData(editEntry);
    } else if (prefillData) {
      setFormData(prefillData);
    } else {
      setFormData({
        drillhole_id: drillholeId || '',
        from: 0,
        to: 0,
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
      });
    }
  }, [editEntry, prefillData, drillholeId]);

  useEffect(() => {
    const loadPages = async () => {
      await csvService.loadConfiguration();
      setPages(csvService.getPages());
    };
    loadPages();

    // Subscribe to configuration changes
    const handleConfigChange = async () => {
      await loadPages();
    };
    csvService.addConfigurationChangeListener(handleConfigChange);

    return () => {
      csvService.removeConfigurationChangeListener(handleConfigChange);
    };
  }, []);

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('[QuickLogForm] Submitting form data:', formData);
    onSubmit({
      ...formData,
      drillhole_id: drillholeId || '',
      modified: new Date(),
      synced: false,
    } as LogEntry);
  };

  const renderField = (field: FieldConfig) => {
    if (field.visibility_style === 'hidden') {
      return null;
    }

    switch (field.visibility_style) {
      case 'buttons':
        return (
          <Box key={field.field_name} sx={{ mb: 2 }}>
            <InputLabel>{field.description}</InputLabel>
            <ToggleButtonGroup
              value={formData[field.field_name] || ''}
              exclusive
              onChange={(e, value) => handleChange(field.field_name)(e, value)}
              aria-label={field.description}
              sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}
            >
              {field.domain_values.map(value => {
                const style = field.style_config?.colors?.[value] 
                  ? { backgroundColor: field.style_config.colors[value], color: '#fff' }
                  : {};
                const icon = field.style_config?.icons?.[value];
                return (
                  <ToggleButton 
                    key={value} 
                    value={value}
                    sx={{
                      ...style,
                      '&.Mui-selected': {
                        ...style,
                        opacity: 1,
                      },
                      '&:not(.Mui-selected)': {
                        opacity: 0.6,
                      }
                    }}
                  >
                    {icon ? `${icon} ${value}` : value}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Box>
        );

      case 'dropdown':
        return (
          <FormControl fullWidth key={field.field_name} margin="normal">
            <InputLabel>{field.description}</InputLabel>
            <Select
              value={formData[field.field_name] || ''}
              onChange={e => handleChange(field.field_name)(e as any, e.target.value)}
              label={field.description}
              required={field.required}
            >
              {field.domain_values.map(value => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'switch':
        return (
          <FormControlLabel
            key={field.field_name}
            control={
              <Switch
                checked={formData[field.field_name] || false}
                onChange={e => handleChange(field.field_name)(e, e.target.checked)}
              />
            }
            label={field.description}
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
            onChange={e => handleChange(field.field_name)(e, e.target.value)}
            required={field.required}
            margin="normal"
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
            onChange={e => handleChange(field.field_name)(e, e.target.value)}
            required={field.required}
            margin="normal"
            inputProps={{ step: 'any' }}
          />
        );
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
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
    </Box>
  );
}
