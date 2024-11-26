import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          '&.Mui-selected': {
            backgroundColor: '#1976d2',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#1976d2',
            color: '#fff',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
          },
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
            borderLeft: '4px solid #1976d2',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.18)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.18)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            transform: 'translateX(20px)',
            '& + .MuiSwitch-track': {
              backgroundColor: '#1976d2 !important',
              opacity: 1,
            },
          },
        },
        track: {
          borderRadius: 13,
          border: '1px solid #e0e0e0',
          backgroundColor: '#fafafa',
          opacity: 1,
          transition: 'all 0.2s ease-in-out',
        },
        thumb: {
          boxShadow: '0 2px 4px 0 rgba(0,0,0,0.2)',
          backgroundColor: '#fff',
          width: 20,
          height: 20,
          transition: 'all 0.2s ease-in-out',
        },
      },
    },
  },
});
