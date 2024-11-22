import React, { useEffect, useState } from 'react';
import DatabaseService from './services/DatabaseService';
import MainPage from './pages/MainPage';
import ConfigurationPage from './pages/ConfigurationPage';
import ConfigurationService from './services/ConfigurationService';
import { CircularProgress, Box, ThemeProvider, CssBaseline, Alert } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { theme } from './theme';
import { ErrorBoundary } from './components/ErrorBoundary';

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

  const configService = ConfigurationService.getInstance();
  const theme = configService.getTheme();

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
        <Router>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/config" element={<ConfigurationPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
