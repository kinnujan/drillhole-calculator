import React, { useState, useEffect, useRef } from 'react';
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
  ButtonGroup,
  Typography
} from '@mui/material';
import { LogEntry } from '../types';
import { FieldConfig, type VisibilityStyle, type PageInfo } from '../types/Field';
import csvService from '../services/CSVService';
import { v4 as uuidv4 } from 'uuid';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OverlapDialog from './OverlapDialog';

interface HintTarget {
  type: 'option' | 'depth_adjust' | 'tab' | 'field';
  fieldName: string;
  value: string;
  amount?: number;
  index?: number;
  element?: HTMLElement;
}

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
    left: '50%',
    transform: 'translateX(-50%)',
    bgcolor: '#000000',
    color: '#ffffff',
    px: 1.5,
    py: 0.25,
    borderRadius: 1,
    fontSize: '1rem',
    fontWeight: 'bold',
    minWidth: '1.8em',
    height: '1.5em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    zIndex: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    border: '2px solid #ffffff',
    lineHeight: 1
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
  }
};

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

// Hardcoded hints for depth buttons
const TO_DEPTH_HINTS: Record<string, string> = {
  '-100': 'q',
  '-10': 'w',
  '-1': 'e',
  '-0.1': 'r',
  '0.1': 'u',
  '1': 'i',
  '10': 'o',
  '100': 'p'
};

const FROM_DEPTH_HINTS: Record<string, string> = {
  '-100': 'Q',
  '-10': 'W',
  '-1': 'E',
  '-0.1': 'R',
  '0.1': 'U',
  '1': 'I',
  '10': 'O',
  '100': 'P'
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

  // Generate hints for fields (a-z, then aa-zz if needed)
  const generateHint = (index: number): string => {
    // Special handling for from/to fields
    const target = hintTargets[index];
    if (target && target.type === 'field') {
      if (target.fieldName === 'from') return 'a';
      if (target.fieldName === 'to') return 'b';
    }

    // For other targets, use the standard hint generation
    if (index < 0) return '';
    const letters = 'cdefghijklmnopqrstuvwxyz';
    return letters[index % letters.length];
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
    const fields = csvService.getFields();

    // Add only from/to field targets
    fields.forEach(field => {
      if (field.field_name === 'from' || field.field_name === 'to') {
        targets.push({
          type: 'field',
          fieldName: field.field_name,
          value: field.field_name
        });
      }
    });
    
    console.log('[QuickLogForm] Collected hint targets:', targets);
    return targets;
  };

  return (
    <Box>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          aria-label="form tabs"
        >
          {pages.map((page, index) => (
            <Tab key={page.name} label={page.name} id={`tab-${index}`} />
          ))}
        </Tabs>

        {pages.map((page, index) => (
          <TabPanel key={page.name} value={currentTab} index={index}>
            <Box sx={commonStyles.pageContainer}>
              <Box sx={commonStyles.depthContainer}>
                <TextField
                  label="From"
                  type="number"
                  value={formData.from || ''}
                  onChange={(e) => setFormData({ ...formData, from: parseFloat(e.target.value) })}
                />
                <TextField
                  label="To"
                  type="number"
                  value={formData.to || ''}
                  onChange={(e) => setFormData({ ...formData, to: parseFloat(e.target.value) })}
                />
              </Box>

              {getCurrentPageFields().map((field) => (
                <Box key={field.field_name} sx={commonStyles.fieldContainer}>
                  {field.field_type === 'select' ? (
                    <FormControl fullWidth>
                      <InputLabel>{field.field_name}</InputLabel>
                      <Select
                        value={formData[field.field_name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                        label={field.field_name}
                      >
                        {field.options?.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      label={field.field_name}
                      value={formData[field.field_name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.field_name]: e.target.value })}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </TabPanel>
        ))}
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => {
            if (onSubmit) {
              onSubmit(formData as Omit<LogEntry, 'id'>);
            }
          }}
        >
          Save
        </Button>
      </Box>

      {/* Hint mode overlay */}
      {hintMode && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              p: 4,
              borderRadius: 2,
              maxWidth: 400
            }}
          >
            <Typography variant="h6" gutterBottom>
              Hint Mode
            </Typography>
            <Typography>
              Press the corresponding key to activate a field:
            </Typography>
            <Box sx={{ mt: 2 }}>
              {hintTargets.map((target, index) => (
                <Box key={index} sx={{ mb: 1 }}>
                  <Typography>
                    {generateHint(index)}: {target.fieldName}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default QuickLogForm;