import { v4 as uuidv4 } from 'uuid';

export interface LogEntryField {
  name: string;
  type: 'domain' | 'boolean' | 'number' | 'text';
  required: boolean;
  domain?: string[];
  min?: number;
  max?: number;
}

export interface LogEntry {
  id: string;
  holeid: string;
  from: number;
  to: number;
  fields: Record<string, string | number | boolean>;
  created: Date;
  modified: Date;
  synced: boolean;
}

export class LogEntryManager {
  static createEntry(
    holeid: string,
    from: number,
    to: number,
    fields: Record<string, string | number | boolean>
  ): LogEntry {
    const now = new Date();
    return {
      id: uuidv4(),
      holeid,
      from,
      to,
      fields,
      created: now,
      modified: now,
      synced: false,
    };
  }

  static validateInterval(entry: LogEntry, adjacentEntries: LogEntry[]): boolean {
    // Sort adjacent entries by 'from' field
    const sortedEntries = [...adjacentEntries].sort((a, b) => a.from - b.from);

    // Find the entry's position
    const index = sortedEntries.findIndex((e) => e.id === entry.id);

    // Check for gaps or overlaps
    if (index > 0) {
      const prevEntry = sortedEntries[index - 1];
      if (entry.from !== prevEntry.to) {
        return false;
      }
    }

    if (index < sortedEntries.length - 1) {
      const nextEntry = sortedEntries[index + 1];
      if (entry.to !== nextEntry.from) {
        return false;
      }
    }

    return true;
  }

  static validateFields(entry: LogEntry, config: LogEntryField[]): string[] {
    const errors: string[] = [];

    // Validate required fields
    config.forEach((field) => {
      const value = entry.fields[field.name];

      if (field.required && (value === undefined || value === '')) {
        errors.push(`${field.name} is required`);
        return;
      }

      if (value === undefined || value === '') {
        return;
      }

      switch (field.type) {
        case 'domain':
          if (field.domain && !field.domain.includes(value as string)) {
            errors.push(`${field.name} must be one of: ${field.domain.join(', ')}`);
          }
          break;

        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push(`${field.name} must be a number`);
          } else {
            if (field.min !== undefined && numValue < field.min) {
              errors.push(`${field.name} must be greater than or equal to ${field.min}`);
            }
            if (field.max !== undefined && numValue > field.max) {
              errors.push(`${field.name} must be less than or equal to ${field.max}`);
            }
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${field.name} must be a boolean`);
          }
          break;
      }
    });

    return errors;
  }
}
