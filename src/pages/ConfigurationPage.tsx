import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import ConfigurationService from '../services/ConfigurationService';
import { useTheme } from '@mui/material/styles';

const ConfigurationPage: React.FC = () => {
  const theme = useTheme();
  const configService = ConfigurationService.getInstance();
  const [darkMode, setDarkMode] = useState(configService.getConfig().darkMode);

  const handleDarkModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDarkMode = event.target.checked;
    setDarkMode(newDarkMode);
    configService.updateConfig({ darkMode: newDarkMode });
    // Force a page reload to apply the theme change
    window.location.reload();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Configuration
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <Divider sx={{ my: 2 }} />
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={handleDarkModeChange}
                color="primary"
              />
            }
            label="Dark Mode"
          />
        </CardContent>
      </Card>

      {/* Add more configuration sections here */}
    </Box>
  );
};

export default ConfigurationPage;
