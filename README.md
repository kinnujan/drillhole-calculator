# QuickLog PWA

A Progressive Web Application for geological logging with offline capabilities and Dropbox synchronization. Built with React and TypeScript, featuring robust error handling and automatic data persistence.

## Features

- Dynamic form generation based on configuration
- Smart interval handling for geological logs
- Offline-first architecture with IndexedDB
- Robust Dropbox synchronization with retry mechanism
- Automatic data saving and recovery
- Error boundary protection
- PWA capabilities for offline use

## Key Components

- **Auto-save**: Automatically saves entries after 3 seconds of inactivity
- **Error Recovery**: Built-in error boundary and recovery system
- **Sync Service**: Reliable synchronization with exponential backoff
- **Database Service**: Efficient local storage with hole-based querying

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
  ├── components/     # React components
  │   └── ErrorBoundary.tsx    # Global error handling
  ├── services/      # Core services
  │   ├── DatabaseService.ts   # IndexedDB operations
  │   ├── SyncService.ts      # Dropbox sync
  │   └── ErrorRecoveryService.ts # Error handling
  ├── models/        # Data models
  ├── hooks/         # Custom React hooks
  ├── utils/         # Utility functions
  └── config/        # Configuration files
```

## Configuration

The application uses two main configuration files:
- `configuration.csv`: Defines field structure and validation rules
- `quicklog.csv`: Contains the actual logging data

## Error Handling

The application implements multiple layers of error protection:
- React Error Boundary for component-level errors
- Automatic data backup and recovery
- Sync retry mechanism with exponential backoff
- Detailed error logging and reporting

## Development

This project uses:
- React 18 with TypeScript
- Material-UI for components
- Tailwind CSS for styling
- IndexedDB for local storage
- Dropbox API for synchronization
- Service Workers for offline functionality

## Recent Improvements

- Added hole-based entry querying
- Implemented auto-save functionality
- Enhanced sync reliability with retry mechanism
- Added comprehensive error recovery system
