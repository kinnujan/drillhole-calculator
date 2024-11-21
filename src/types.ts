export interface LogEntry {
  id?: string;
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
}

export interface BackupEntry {
  id: string;
  timestamp: Date;
  data: string;
  type: 'full' | 'incremental';
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
