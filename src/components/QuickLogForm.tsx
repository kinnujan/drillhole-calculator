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

interface QuickLogFormProps {
  onSubmit: (entry: LogEntry) => void;
  initialValues?: LogEntry;
  drillholeId: string;
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

export default function QuickLogForm({ onSubmit, initialValues, drillholeId }: QuickLogFormProps) {
  const [formData, setFormData] = useState<any>(initialValues || {});
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const csvService = CSVService.getInstance();

  useEffect(() => {
    const loadPages = async () => {
      await csvService.loadConfiguration();
      setPages(csvService.getPages());
      
      // Set hidden field values
      const hiddenFields = csvService.getHiddenFields();
      const hiddenValues: Record<string, any> = {};
      hiddenFields.forEach(field => {
        if (field.field_name === 'drillhole_id') {
          hiddenValues[field.field_name] = drillholeId;
        }
      });
      setFormData(prev => ({ ...prev, ...hiddenValues }));
    };
    loadPages();
  }, [drillholeId]);

  const handleChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement> | null,
    newValue: string | boolean | null
  ) => {
    let value = newValue;
    
    // Handle different event types
    if (event?.target instanceof HTMLInputElement) {
      value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    }
    
    if (value !== null) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      id: formData.id || crypto.randomUUID(),
      created: formData.created || new Date(),
      modified: new Date(),
      synced: false,
      ...formData
    });
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
          />
        );
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <form onSubmit={handleSubmit}>
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

        <Box sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" color="primary">
            Save Entry
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
