import React, { useEffect, useState } from 'react';
import { CircularProgress, Box, ThemeProvider, CssBaseline, Alert } from '@mui/material';
import MainPage from './pages/MainPage';
import configurationService from './services/ConfigurationService';
import databaseService from './services/DatabaseService';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState(configurationService.getTheme());

  useEffect(() => {
    const savedConfig = configurationService.getConfig();
    setTheme(configurationService.getTheme());

    const initializeApp = async () => {
      try {
        await databaseService.initialize();
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setError('Failed to initialize the application. Please try refreshing the page.');
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainPage />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
