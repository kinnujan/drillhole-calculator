import { v4 as uuidv4 } from 'uuid';
import { LogEntry } from '../types';

export interface LogEntryField {
  name: string;
  type: string;
  required: boolean;
  domain?: string[];
}

export class LogEntryManager {
  static createEntry(
    drillhole_id: string,
    from: number,
    to: number,
    fields: Record<string, any>
  ): LogEntry {
    return {
      id: uuidv4(),
      drillhole_id,
      from,
      to,
      lithology: '',
      fields,
      created: new Date(),
      modified: new Date(),
      synced: false,
      originalEntryId: null
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

  static validateFields(entry: LogEntry, fields: LogEntryField[]): string[] {
    const errors: string[] = [];

    fields.forEach((field) => {
      if (field.required && !entry.fields[field.name]) {
        errors.push(`${field.name} is required`);
      }
    });

    return errors;
  }
}
