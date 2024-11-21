import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import { LogEntry } from '../types';
import DatabaseService from '../services/DatabaseService';
import CSVService from '../services/CSVService';
import { FieldConfig } from '../services/CSVService';

interface QuickLogFormProps {
  onSubmit: (entry: LogEntry) => void;
  initialValues?: Partial<LogEntry>;
}

const QuickLogForm: React.FC<QuickLogFormProps> = ({ onSubmit, initialValues }) => {
  const [formData, setFormData] = useState<Partial<LogEntry>>({
    holeid: '',
    from: 0,
    to: 0,
    lithology: '',
    color: '',
    texture: '',
    minerals: '',
    mineralized: false,
    structures: '',
    notes: '',
    ...initialValues
  });

  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [lastInterval, setLastInterval] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    const loadConfiguration = async () => {
      const csvService = CSVService.getInstance();
      await csvService.loadConfiguration();
      setFields(csvService.getConfiguration());
    };

    const loadLastInterval = async () => {
      const dbService = DatabaseService.getInstance();
      const entries = await dbService.getAllEntries();
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        setLastInterval({ from: lastEntry.from, to: lastEntry.to });
        if (!initialValues) {
          setFormData(prev => ({
            ...prev,
            holeid: lastEntry.holeid,
            from: lastEntry.to
          }));
        }
      }
    };

    loadConfiguration();
    loadLastInterval();
  }, [initialValues]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry: LogEntry = {
      id: initialValues?.id || crypto.randomUUID(),
      created: initialValues?.created || new Date(),
      modified: new Date(),
      synced: false,
      ...formData
    } as LogEntry;

    onSubmit(entry);
    if (!initialValues) {
      setFormData(prev => ({
        ...prev,
        from: formData.to,
        to: formData.to
      }));
    }
  };

  const renderField = (field: FieldConfig) => {
    switch (field.field_type) {
      case 'domain':
        return (
          <FormControl fullWidth key={field.field_name} margin="normal">
            <InputLabel>{field.description}</InputLabel>
            <Select
              value={formData[field.field_name as keyof LogEntry] || ''}
              onChange={(e: SelectChangeEvent) => handleChange(field.field_name, e.target.value)}
              label={field.description}
              required={field.required}
            >
              {field.domain_values?.map(value => (
                <MenuItem 
                  key={value} 
                  value={value}
                  style={field.style_config?.colors ? { color: field.style_config.colors[value] } : {}}
                >
                  {field.style_config?.icons ? field.style_config.icons[value] : ''} {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControlLabel
            key={field.field_name}
            control={
              <Checkbox
                checked={formData[field.field_name as keyof LogEntry] as boolean || false}
                onChange={(e) => handleChange(field.field_name, e.target.checked)}
              />
            }
            label={field.description}
          />
        );

      case 'number':
        return (
          <TextField
            key={field.field_name}
            fullWidth
            label={field.description}
            type="number"
            value={formData[field.field_name as keyof LogEntry] || ''}
            onChange={(e) => handleChange(field.field_name, parseFloat(e.target.value))}
            required={field.required}
            margin="normal"
          />
        );

      default:
        return (
          <TextField
            key={field.field_name}
            fullWidth
            label={field.description}
            value={formData[field.field_name as keyof LogEntry] || ''}
            onChange={(e) => handleChange(field.field_name, e.target.value)}
            required={field.required}
            margin="normal"
            multiline={field.field_name === 'notes'}
            rows={field.field_name === 'notes' ? 4 : 1}
          />
        );
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {initialValues ? 'Edit Log Entry' : 'New Log Entry'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lastInterval && !initialValues && (
            <Typography variant="body2" color="text.secondary">
              Last interval: {lastInterval.from}m to {lastInterval.to}m
            </Typography>
          )}
          {fields.map(field => renderField(field))}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            {initialValues ? 'Update' : 'Add'} Entry
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default QuickLogForm;
