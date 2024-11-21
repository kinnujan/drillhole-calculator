# QuickLog PWA

A Progressive Web Application for geological logging with offline capabilities and Dropbox synchronization.

## Features

- Dynamic form generation based on configuration
- Smart interval handling
- Offline-first architecture
- Dropbox synchronization
- PWA capabilities

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
  ├── services/      # Core services
  ├── models/        # Data models
  ├── hooks/         # Custom React hooks
  ├── utils/         # Utility functions
  └── config/        # Configuration files
```

## Configuration

The application uses two main configuration files:
- `configuration.csv`: Defines field structure and validation rules
- `quicklog.csv`: Contains the actual logging data

## Development

This project uses:
- React with TypeScript
- Material-UI for components
- Tailwind CSS for styling
- IndexedDB for local storage
- Dropbox API for synchronization
