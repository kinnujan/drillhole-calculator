import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon, 
  Cancel as CancelIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import CSVService from '../services/CSVService';
import DomainValueEditor from './DomainValueEditor';

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

interface ConfigurationEditorProps {
  onSave: (fields: Field[]) => void;
}

const VISIBILITY_STYLES = ['visible', 'hidden', 'buttons', 'dropdown', 'switch', 'textarea'];
const FIELD_TYPES = ['text', 'number', 'date', 'domain', 'boolean'];

export default function ConfigurationEditor({ onSave }: ConfigurationEditorProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainEditorOpen, setDomainEditorOpen] = useState(false);
  const [editingDomainField, setEditingDomainField] = useState<Field | null>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);
      const csvService = CSVService.getInstance();
      const loadedFields = await csvService.loadConfiguration();
      setFields(loadedFields);
    } catch (error) {
      setError('Failed to load configuration. Please try again.');
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: Field) => {
    setEditingField({ ...field });
  };

  const handleDelete = (fieldToDelete: Field) => {
    setFields(fields.filter(field => field.name !== fieldToDelete.name));
  };

  const handleSave = (field: Field) => {
    if (!field.name) {
      setError('Field name is required');
      return;
    }

    const updatedFields = fields.map(f => 
      f.name === field.name ? field : f
    );
    setFields(updatedFields);
    setEditingField(null);
    setError(null);
  };

  const handleCancel = () => {
    setEditingField(null);
    setError(null);
  };

  const handleAddField = () => {
    const newField: Field = {
      name: '',
      type: 'text',
      page_name: '',
      page_order: 0,
      visibility_style: 'visible',
      required: false,
      domain_values: [],
      default_value: '',
      description: '',
      style_config: {},
    };
    setEditingField(newField);
    setFields([...fields, newField]);
  };

  const handleSaveAll = () => {
    // Validate all fields
    const invalidField = fields.find(field => !field.name);
    if (invalidField) {
      setError('All fields must have a name');
      return;
    }

    // Validate domain fields have values
    const invalidDomainField = fields.find(field => 
      field.type === 'domain' && (!field.domain_values || field.domain_values.length === 0)
    );
    if (invalidDomainField) {
      setError(`Domain field "${invalidDomainField.name}" must have at least one value`);
      return;
    }

    onSave(fields);
  };

  const handleEditDomainValues = (field: Field) => {
    setEditingDomainField(field);
    setDomainEditorOpen(true);
  };

  const handleDomainValuesSave = (values: string[], styleConfig: any) => {
    if (!editingDomainField) return;

    const updatedField = {
      ...editingDomainField,
      domain_values: values,
      style_config: styleConfig,
    };

    // Update the field in both the fields array and editingField if it's being edited
    setFields(fields.map(f => 
      f.name === updatedField.name ? updatedField : f
    ));
    
    if (editingField?.name === updatedField.name) {
      setEditingField(updatedField);
    }

    setDomainEditorOpen(false);
    setEditingDomainField(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Field Name*</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Page Name</TableCell>
              <TableCell>Page Order</TableCell>
              <TableCell>Visibility Style</TableCell>
              <TableCell>Required</TableCell>
              <TableCell>Domain Values</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.name || 'new'}>
                {editingField && editingField.name === field.name ? (
                  <>
                    <TableCell>
                      <TextField
                        value={editingField.name}
                        onChange={(e) => setEditingField({ ...editingField, name: e.target.value })}
                        size="small"
                        fullWidth
                        required
                        error={!editingField.name}
                        helperText={!editingField.name ? 'Required' : ''}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={editingField.type}
                          onChange={(e) => setEditingField({ ...editingField, type: e.target.value })}
                        >
                          {FIELD_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={editingField.page_name}
                        onChange={(e) => setEditingField({ ...editingField, page_name: e.target.value })}
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={editingField.page_order}
                        onChange={(e) => setEditingField({ ...editingField, page_order: parseInt(e.target.value) || 0 })}
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={editingField.visibility_style}
                          onChange={(e) => setEditingField({ ...editingField, visibility_style: e.target.value })}
                        >
                          {VISIBILITY_STYLES.map((style) => (
                            <MenuItem key={style} value={style}>{style}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={editingField.required ? 'true' : 'false'}
                          onChange={(e) => setEditingField({ ...editingField, required: e.target.value === 'true' })}
                        >
                          <MenuItem value="true">Yes</MenuItem>
                          <MenuItem value="false">No</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {editingField.type === 'domain' && (
                        <Box>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            {editingField.domain_values?.map((value) => (
                              <Chip
                                key={value}
                                label={value}
                                size="small"
                                sx={{
                                  bgcolor: editingField.style_config?.colors?.[value],
                                  color: editingField.style_config?.colors?.[value] ? 'white' : 'inherit',
                                }}
                              />
                            ))}
                          </Stack>
                          <Button
                            size="small"
                            onClick={() => handleEditDomainValues(editingField)}
                            startIcon={<SettingsIcon />}
                          >
                            Edit Values
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleSave(editingField)} size="small">
                        <SaveIcon />
                      </IconButton>
                      <IconButton onClick={handleCancel} size="small">
                        <CancelIcon />
                      </IconButton>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{field.name}</TableCell>
                    <TableCell>{field.type}</TableCell>
                    <TableCell>{field.page_name}</TableCell>
                    <TableCell>{field.page_order}</TableCell>
                    <TableCell>{field.visibility_style}</TableCell>
                    <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      {field.type === 'domain' && (
                        <Box>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            {field.domain_values?.map((value) => (
                              <Chip
                                key={value}
                                label={value}
                                size="small"
                                sx={{
                                  bgcolor: field.style_config?.colors?.[value],
                                  color: field.style_config?.colors?.[value] ? 'white' : 'inherit',
                                }}
                              />
                            ))}
                          </Stack>
                          <Button
                            size="small"
                            onClick={() => handleEditDomainValues(field)}
                            startIcon={<SettingsIcon />}
                          >
                            Edit Values
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEdit(field)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(field)} size="small">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleAddField}>
          Add Field
        </Button>
        <Button variant="contained" color="primary" onClick={handleSaveAll}>
          Save All
        </Button>
      </Box>

      {editingDomainField && (
        <DomainValueEditor
          open={domainEditorOpen}
          onClose={() => {
            setDomainEditorOpen(false);
            setEditingDomainField(null);
          }}
          field={editingDomainField}
          onSave={handleDomainValuesSave}
        />
      )}
    </Box>
  );
}
