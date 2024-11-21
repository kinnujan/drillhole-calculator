import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import DatabaseService from '../services/DatabaseService';
import { LogEntry } from '../models/LogEntry';

interface DatabaseContextType {
  entries: LogEntry[];
  isLoading: boolean;
  error: string | null;
  refreshEntries: () => Promise<void>;
  addEntry: (entry: LogEntry) => Promise<void>;
  updateEntry: (entry: LogEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedEntries = await DatabaseService.getAllEntries();
      setEntries(loadedEntries);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load entries');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshEntries();
  }, []);

  const addEntry = async (entry: LogEntry) => {
    try {
      await DatabaseService.addEntry(entry);
      await refreshEntries();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add entry');
      throw error;
    }
  };

  const updateEntry = async (entry: LogEntry) => {
    try {
      await DatabaseService.updateEntry(entry);
      await refreshEntries();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update entry');
      throw error;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await DatabaseService.deleteEntry(id);
      await refreshEntries();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete entry');
      throw error;
    }
  };

  return (
    <DatabaseContext.Provider
      value={{
        entries,
        isLoading,
        error,
        refreshEntries,
        addEntry,
        updateEntry,
        deleteEntry,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
