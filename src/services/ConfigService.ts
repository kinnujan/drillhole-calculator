import { LogEntryField } from '../models/LogEntry';

export class ConfigService {
  private static instance: ConfigService;
  private fields: LogEntryField[] = [];
  private configLastModified: Date | null = null;

  private constructor() {}

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async parseConfigFile(content: string): Promise<void> {
    const lines = content.split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid configuration file format');
    }

    // Parse header
    const headers = lines[0].trim().split(',');
    const requiredColumns = ['name', 'type', 'required'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Clear existing fields
    this.fields = [];

    // Parse each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      const field: LogEntryField = {
        name: values[headers.indexOf('name')],
        type: values[headers.indexOf('type')] as 'domain' | 'boolean' | 'number' | 'text',
        required: values[headers.indexOf('required')].toLowerCase() === 'true',
      };

      // Parse optional fields
      const domainIndex = headers.indexOf('domain');
      if (domainIndex !== -1 && values[domainIndex]) {
        field.domain = values[domainIndex].split(';').map(v => v.trim());
      }

      const minIndex = headers.indexOf('min');
      if (minIndex !== -1 && values[minIndex]) {
        field.min = Number(values[minIndex]);
      }

      const maxIndex = headers.indexOf('max');
      if (maxIndex !== -1 && values[maxIndex]) {
        field.max = Number(values[maxIndex]);
      }

      this.validateField(field);
      this.fields.push(field);
    }

    this.configLastModified = new Date();
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    values.push(currentValue.trim());
    return values;
  }

  private validateField(field: LogEntryField): void {
    if (!field.name) {
      throw new Error('Field name is required');
    }

    if (!['domain', 'boolean', 'number', 'text'].includes(field.type)) {
      throw new Error(`Invalid field type for ${field.name}: ${field.type}`);
    }

    if (field.type === 'domain' && (!field.domain || field.domain.length === 0)) {
      throw new Error(`Domain values are required for domain field: ${field.name}`);
    }

    if (field.type === 'number') {
      if (field.min !== undefined && isNaN(field.min)) {
        throw new Error(`Invalid min value for ${field.name}`);
      }
      if (field.max !== undefined && isNaN(field.max)) {
        throw new Error(`Invalid max value for ${field.name}`);
      }
      if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
        throw new Error(`Min value cannot be greater than max value for ${field.name}`);
      }
    }
  }

  getFields(): LogEntryField[] {
    return [...this.fields];
  }

  getLastModified(): Date | null {
    return this.configLastModified;
  }
}
