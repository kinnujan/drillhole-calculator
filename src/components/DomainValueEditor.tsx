import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  ColorLens as ColorLensIcon,
} from '@mui/icons-material';
import { SketchPicker } from 'react-color';

interface DomainValue {
  value: string;
  color?: string;
  icon?: string;
  order: number;
}

interface DomainValueEditorProps {
  open: boolean;
  onClose: () => void;
  field: {
    name: string;
    domain_values?: string[];
    style_config?: any;
  };
  onSave: (values: string[], styleConfig: any) => void;
}

export default function DomainValueEditor({ open, onClose, field, onSave }: DomainValueEditorProps) {
  const [domainValues, setDomainValues] = useState<DomainValue[]>([]);
  const [newValue, setNewValue] = useState('');
  const [colorPickerOpen, setColorPickerOpen] = useState<number | null>(null);
  const [iconInput, setIconInput] = useState<number | null>(null);

  useEffect(() => {
    // Initialize domain values from field
    const initialValues = field.domain_values?.map((value, index) => ({
      value,
      color: field.style_config?.colors?.[value] || '',
      icon: field.style_config?.icons?.[value] || '',
      order: index,
    })) || [];
    setDomainValues(initialValues);
  }, [field]);

  const handleAddValue = () => {
    if (!newValue.trim()) return;
    
    setDomainValues([
      ...domainValues,
      {
        value: newValue.trim(),
        color: '',
        icon: '',
        order: domainValues.length,
      }
    ]);
    setNewValue('');
  };

  const handleDeleteValue = (index: number) => {
    setDomainValues(domainValues.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newValues = [...domainValues];
    [newValues[index - 1], newValues[index]] = [newValues[index], newValues[index - 1]];
    newValues.forEach((value, i) => value.order = i);
    setDomainValues(newValues);
  };

  const handleMoveDown = (index: number) => {
    if (index === domainValues.length - 1) return;
    const newValues = [...domainValues];
    [newValues[index], newValues[index + 1]] = [newValues[index + 1], newValues[index]];
    newValues.forEach((value, i) => value.order = i);
    setDomainValues(newValues);
  };

  const handleColorChange = (index: number, color: any) => {
    const newValues = [...domainValues];
    newValues[index].color = color.hex;
    setDomainValues(newValues);
  };

  const handleIconChange = (index: number, icon: string) => {
    const newValues = [...domainValues];
    newValues[index].icon = icon;
    setDomainValues(newValues);
    setIconInput(null);
  };

  const handleSave = () => {
    // Convert domain values back to format expected by parent
    const values = domainValues.map(dv => dv.value);
    const styleConfig = {
      colors: Object.fromEntries(
        domainValues.filter(dv => dv.color).map(dv => [dv.value, dv.color])
      ),
      icons: Object.fromEntries(
        domainValues.filter(dv => dv.icon).map(dv => [dv.value, dv.icon])
      ),
    };
    onSave(values, styleConfig);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Edit Domain Values for {field.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add New Value
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Enter new value"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddValue();
                }
              }}
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleAddValue}
              disabled={!newValue.trim()}
              startIcon={<AddIcon />}
            >
              Add
            </Button>
          </Stack>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Value</TableCell>
                <TableCell>Color</TableCell>
                <TableCell>Icon</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {domainValues.map((dv, index) => (
                <TableRow key={dv.value}>
                  <TableCell>{dv.value}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          bgcolor: dv.color || 'transparent',
                          border: '1px solid #ccc',
                          borderRadius: 1,
                          cursor: 'pointer',
                        }}
                        onClick={() => setColorPickerOpen(index)}
                      />
                      {colorPickerOpen === index && (
                        <Box sx={{ position: 'absolute', zIndex: 2 }}>
                          <Box
                            sx={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0 }}
                            onClick={() => setColorPickerOpen(null)}
                          />
                          <SketchPicker
                            color={dv.color}
                            onChange={(color) => handleColorChange(index, color)}
                          />
                        </Box>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => setColorPickerOpen(index)}
                      >
                        <ColorLensIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {iconInput === index ? (
                      <TextField
                        size="small"
                        value={dv.icon}
                        onChange={(e) => handleIconChange(index, e.target.value)}
                        onBlur={() => setIconInput(null)}
                        autoFocus
                      />
                    ) : (
                      <Box
                        onClick={() => setIconInput(index)}
                        sx={{ cursor: 'pointer', minWidth: 30 }}
                      >
                        {dv.icon || '(click to edit)'}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Move Up">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            <ArrowUpIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Move Down">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === domainValues.length - 1}
                          >
                            <ArrowDownIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteValue(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
