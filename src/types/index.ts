export interface LogEntry {
  id: string;
  drillhole_id: string;
  from: number;
  to: number;
  created: Date;
  modified: Date;
  synced: boolean;
  fields: Record<string, any>;
  originalEntryId?: string;
}

export interface BackupEntry {
  id: string;
  entry: LogEntry;
  timestamp: Date;
}

export interface ErrorLog {
  id: string;
  message: string;
  timestamp: Date;
  details?: any;
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
