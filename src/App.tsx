import React, { useEffect, useState } from 'react';
import { CircularProgress, Box, ThemeProvider, CssBaseline, Alert } from '@mui/material';
import MainPage from './pages/MainPage';
import ConfigurationService from './services/ConfigurationService';
import DatabaseService from './services/DatabaseService';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configService = ConfigurationService.getInstance();
  const theme = configService.getTheme();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        await dbService.initialize();
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
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" color="error.main">
          {error}
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
