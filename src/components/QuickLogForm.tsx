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
  editEntry: LogEntry | null;
  drillholeId: string;
  prefillData?: Partial<LogEntry> | null;
}

const QuickLogForm: React.FC<QuickLogFormProps> = ({ 
  onSubmit, 
  editEntry, 
  drillholeId,
  prefillData 
}) => {
  const [formData, setFormData] = useState<Partial<LogEntry>>({
    drillhole_id: drillholeId,
    from: 0,
    to: 0,
    lithology: '',
    color: '',
    texture: '',
    minerals: '',
    mineralized: false,
    structures: '',
    notes: '',
  });

  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [lastInterval, setLastInterval] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    if (editEntry) {
      setFormData(editEntry);
    } else if (prefillData) {
      setFormData(prev => ({
        ...prev,
        ...prefillData,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        drillhole_id: drillholeId,
      }));
    }
  }, [editEntry, drillholeId, prefillData]);

  useEffect(() => {
    const loadConfiguration = async () => {
      const csvService = CSVService.getInstance();
      await csvService.loadConfiguration();
      setFields(csvService.getConfiguration());
    };

    const loadLastInterval = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        const entries = await dbService.getEntriesByHole(drillholeId);
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          setLastInterval({
            from: lastEntry.from,
            to: lastEntry.to,
          });
          
          if (!editEntry) {
            setFormData(prev => ({
              ...prev,
              from: lastEntry.to,
              to: lastEntry.to + 1,
            }));
          }
        }
      } catch (error) {
        console.error('Error loading last interval:', error);
      }
    };

    loadConfiguration();
    loadLastInterval();
  }, [drillholeId]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If editing from/to fields, ensure they're valid numbers
      if (field === 'from' || field === 'to') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          newData[field] = numValue;
          
          // When editing 'from', adjust 'to' if it would become invalid
          if (field === 'from' && newData.to !== undefined && numValue > newData.to) {
            newData.to = numValue;
          }
          // When editing 'to', adjust 'from' if it would become invalid
          if (field === 'to' && newData.from !== undefined && numValue < newData.from) {
            newData.from = numValue;
          }
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entry: LogEntry = {
      ...formData,
      drillhole_id: drillholeId,
    } as LogEntry;
    
    onSubmit(entry);
    
    if (!editEntry) {
      setFormData({
        drillhole_id: drillholeId,
        from: entry.to,
        to: entry.to + 1,
        lithology: '',
        color: '',
        texture: '',
        minerals: '',
        mineralized: false,
        structures: '',
        notes: '',
      });
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
        {editEntry ? 'Edit Log Entry' : 'New Log Entry'}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lastInterval && !editEntry && (
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
            {editEntry ? 'Update' : 'Add'} Entry
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default QuickLogForm;
