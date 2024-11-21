export interface LogEntry {
  id: string;
  holeid: string;
  fields: Record<string, any>;
  created: Date;
  modified: Date;
  synced: boolean;
  from?: number;
  to?: number;
}

export interface BackupEntry {
  id: string;
  timestamp: string;
  entries: LogEntry[];
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  details: string;
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
