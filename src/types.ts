export interface LogEntry {
  id: string;
  drillhole_id: string;
  from: number;
  to: number;
  lithology: string;
  color?: string;
  texture?: string;
  minerals?: string;
  mineralized?: boolean;
  structures?: string;
  notes?: string;
  created?: Date;
  modified?: Date;
  synced?: boolean;
  originalEntryId?: string;
  fields: Record<string, any>;
}

export interface BackupEntry {
  id: string;
  entry: LogEntry;
  timestamp: Date;
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  error: string;
  context: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface FieldStyle {
  colors?: { [key: string]: string };
  icons?: { [key: string]: string };
}
