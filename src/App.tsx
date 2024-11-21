import React, { useEffect, useState } from 'react';
import DatabaseService from './services/DatabaseService';
import MainPage from './pages/MainPage';
import { CircularProgress, Box, ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const dbService = DatabaseService.getInstance();
        await dbService.initialize();
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing app:', err);
        setError('Failed to initialize the application. Please check the console for details.');
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainPage />
    </ThemeProvider>
  );
}

export default App;
