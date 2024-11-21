import React, { useState, useEffect } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import { ConfigService } from '../services/ConfigService';
import { DatabaseService } from '../services/DatabaseService';
import { LogEntry, LogEntryField, LogEntryManager } from '../models/LogEntry';

interface QuickLogFormProps {
  holeid: string;
  previousEntry?: LogEntry;
  onSave?: () => void;
}

export const QuickLogForm: React.FC<QuickLogFormProps> = ({
  holeid,
  previousEntry,
  onSave,
}) => {
  const [fields, setFields] = useState<LogEntryField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [from, setFrom] = useState<number>(previousEntry ? previousEntry.to : 0);
  const [to, setTo] = useState<number>(previousEntry ? previousEntry.to + 1 : 1);

  useEffect(() => {
    const configService = ConfigService.getInstance();
    setFields(configService.getFields());
  }, []);

  useEffect(() => {
    if (previousEntry) {
      setFrom(previousEntry.to);
      setTo(previousEntry.to + 1);
    }
  }, [previousEntry]);

  const handleChange = (fieldName: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    // Validate intervals
    if (from >= to) {
      validationErrors.push('From value must be less than To value');
    }

    // Validate fields
    const entry = LogEntryManager.createEntry(holeid, from, to, values);
    const fieldErrors = LogEntryManager.validateFields(entry, fields);
    validationErrors.push(...fieldErrors);

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const entry = LogEntryManager.createEntry(holeid, from, to, values);
      const dbService = DatabaseService.getInstance();
      await dbService.addEntry(entry);
      
      // Reset form
      setValues({});
      setFrom(to);
      setTo(to + 1);
      setErrors([]);
      
      onSave?.();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to save entry']);
    }
  };

  const renderField = (field: LogEntryField) => {
    switch (field.type) {
      case 'domain':
        return (
          <FormControl fullWidth margin="normal" key={field.name}>
            <InputLabel>{field.name}</InputLabel>
            <Select
              value={values[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              label={field.name}
              required={field.required}
            >
              {field.domain?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControlLabel
            key={field.name}
            control={
              <Switch
                checked={values[field.name] || false}
                onChange={(e) => handleChange(field.name, e.target.checked)}
              />
            }
            label={field.name}
          />
        );

      case 'number':
        return (
          <TextField
            key={field.name}
            fullWidth
            type="number"
            label={field.name}
            value={values[field.name] || ''}
            onChange={(e) => handleChange(field.name, Number(e.target.value))}
            required={field.required}
            inputProps={{
              min: field.min,
              max: field.max,
              step: 'any',
            }}
            margin="normal"
          />
        );

      default: // text
        return (
          <TextField
            key={field.name}
            fullWidth
            label={field.name}
            value={values[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
            margin="normal"
          />
        );
    }
  };

  return (
    <Paper className="p-4">
      <Typography variant="h6" component="h2" gutterBottom>
        Log Entry
      </Typography>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-4 mb-4">
          <TextField
            label="From"
            type="number"
            value={from}
            onChange={(e) => setFrom(Number(e.target.value))}
            required
            inputProps={{ step: 'any' }}
          />
          <TextField
            label="To"
            type="number"
            value={to}
            onChange={(e) => setTo(Number(e.target.value))}
            required
            inputProps={{ step: 'any' }}
          />
        </div>

        {errors.length > 0 && (
          <Alert severity="error" className="mb-4">
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {fields.map(renderField)}

        <div className="mt-4">
          <Button type="submit" variant="contained" color="primary">
            Save Entry
          </Button>
        </div>
      </form>
    </Paper>
  );
};
