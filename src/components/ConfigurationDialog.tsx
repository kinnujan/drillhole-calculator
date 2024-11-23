import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tab,
  Tabs,
  Box,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
} from '@mui/material';
import ConfigurationEditor from './ConfigurationEditor';
import CSVService from '../services/CSVService';

interface ConfigurationDialogProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  onDarkModeChange: (darkMode: boolean) => void;
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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ConfigurationDialog({
  open,
  onClose,
  darkMode,
  onDarkModeChange,
}: ConfigurationDialogProps) {
  const [currentTab, setCurrentTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSaveConfiguration = async (fields: any[]) => {
    setIsSaving(true);
    try {
      const csvService = CSVService.getInstance();
      await csvService.saveConfiguration(fields);
      setSnackbar({
        open: true,
        message: 'Configuration saved successfully! Reloading page...',
        severity: 'success',
      });
      // Wait for snackbar to be visible before reloading
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setSnackbar({
        open: true,
        message: 'Error saving configuration. Please try again.',
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDarkModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDarkModeChange(event.target.checked);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange}>
              <Tab label="General" />
              <Tab label="Form Configuration" />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={handleDarkModeChange}
                />
              }
              label="Dark Mode"
            />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <ConfigurationEditor onSave={handleSaveConfiguration} />
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSaving}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
