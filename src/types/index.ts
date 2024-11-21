export interface LogEntry {
  id: string;
  holeid: string;
  from: number;
  to: number;
  lithology: string;
  color?: string;
  texture?: string;
  minerals?: string;
  mineralized: boolean;
  structures?: string;
  notes?: string;
  created: Date;
  modified: Date;
  synced: boolean;
}

export interface BackupEntry {
  id: string;
  timestamp: string;
  entries: LogEntry[];
}

export interface ErrorLog {
  id: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface ConfigField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'domain';
  required?: boolean;
  domain?: string[];
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface StyleConfig {
  colors?: Record<string, string>;
  icons?: Record<string, string>;
}
