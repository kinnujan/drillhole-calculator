import Papa from 'papaparse';
import configurationCsv from '../assets/configuration.csv?raw';
import quicklogCsv from '../assets/quicklog.csv?raw';
import { LogEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface Field {
  name: string;
  type: string;
  page_name: string;
  page_order: number;
  visibility_style: string;
  required?: boolean;
  domain_values?: string[];
  default_value?: string;
  description?: string;
  style_config?: any;
}

export interface PageInfo {
  name: string;
  order: number;
}

export type VisibilityStyle = 'visible' | 'hidden' | 'buttons' | 'dropdown';

export interface FieldConfig {
  field_name: string;
  field_type: string;
  required: boolean;
  domain_values: string[];
  default_value: string;
  description: string;
  style_config: any;
  page_name: string;
  page_order: number;
  visibility_style: VisibilityStyle;
}

class CSVService {
  private static instance: CSVService;
  private fields: FieldConfig[] = [];

  private constructor() {}

  static getInstance(): CSVService {
    if (!CSVService.instance) {
      CSVService.instance = new CSVService();
    }
    return CSVService.instance;
  }

  async loadConfiguration(): Promise<Field[]> {
    try {
      const result = Papa.parse(configurationCsv, {
        header: true,
        skipEmptyLines: true
      });

      if (result.errors && result.errors.length > 0) {
        console.error('CSV parsing errors:', result.errors);
        throw new Error('Error parsing configuration file');
      }

      // Map the CSV fields to our Field interface
      this.fields = result.data.map((row: any) => ({
        field_name: row.field_name,
        field_type: row.field_type,
        page_name: row.page_name || '',
        page_order: parseInt(row.page_order) || 0,
        visibility_style: row.visibility_style || 'visible',
        required: row.required === 'true',
        domain_values: row.domain_values ? row.domain_values.split(',').map(s => s.trim()) : [],
        default_value: row.default_value || '',
        description: row.description || '',
        style_config: row.style_config ? JSON.parse(row.style_config) : {},
      }));

      return this.fields.map(f => ({
        name: f.field_name,
        type: f.field_type,
        page_name: f.page_name,
        page_order: f.page_order,
        visibility_style: f.visibility_style,
        required: f.required,
        domain_values: f.domain_values,
        default_value: f.default_value,
        description: f.description,
        style_config: f.style_config,
      }));
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw error;
    }
  }

  async loadQuicklog(): Promise<LogEntry[]> {
    try {
      const result = Papa.parse(quicklogCsv, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        transform: (value) => {
          if (value === '') return null;
          return value;
        }
      });

      if (result.errors && result.errors.length > 0) {
        console.error('CSV parsing errors:', result.errors);
        throw new Error('Error parsing quicklog file');
      }

      return result.data.map((row: any) => {
        // Extract known fields
        const {
          id,
          drillhole_id,
          holeid,
          from,
          to,
          lithology,
          color,
          texture,
          minerals,
          mineralized,
          structures,
          notes,
          created,
          modified,
          synced,
          ...rest
        } = row;

        // Validate required fields
        if (!id || !drillhole_id || from === undefined || to === undefined) {
          console.warn('Missing required fields in row:', row);
        }

        // Convert numeric fields
        const numFrom = Number(from);
        const numTo = Number(to);
        
        if (isNaN(numFrom) || isNaN(numTo)) {
          console.warn(`Invalid from/to values in row with id ${id}: from=${from}, to=${to}`);
        }

        // Create the entry object
        const entry: LogEntry = {
          id: id || uuidv4(),
          drillhole_id: drillhole_id || holeid || '',
          from: isNaN(numFrom) ? 0 : numFrom,
          to: isNaN(numTo) ? 0 : numTo,
          lithology: lithology || '',
          color: color || undefined,
          texture: texture || undefined,
          minerals: minerals || undefined,
          mineralized: mineralized === true || mineralized === 'true',
          structures: structures || undefined,
          notes: notes || undefined,
          created: created ? new Date(created) : new Date(),
          modified: modified ? new Date(modified) : new Date(),
          synced: synced === true || synced === 'true',
          fields: {},
          originalEntryId: null
        };

        // Add any remaining fields to the fields object
        Object.entries(rest).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (typeof value === 'string') {
              if (value.toLowerCase() === 'true') entry.fields[key] = true;
              else if (value.toLowerCase() === 'false') entry.fields[key] = false;
              else if (!isNaN(Number(value))) entry.fields[key] = Number(value);
              else entry.fields[key] = value;
            } else {
              entry.fields[key] = value;
            }
          }
        });

        return entry;
      });
    } catch (error) {
      console.error('Error loading quicklog:', error);
      throw error;
    }
  }

  getFieldStyle(fieldName: string, value: any): any {
    const field = this.fields.find(f => f.field_name === fieldName);
    if (!field || !field.style_config) return {};

    if (field.field_type === 'domain' && field.style_config.values) {
      return field.style_config.values[value] || {};
    }

    return field.style_config;
  }

  async saveConfiguration(fields: Field[]): Promise<void> {
    try {
      const csvData = fields.map(field => ({
        field_name: field.name,
        field_type: field.type,
        page_name: field.page_name,
        page_order: field.page_order.toString(),
        visibility_style: field.visibility_style,
        required: field.required?.toString() || 'false',
        domain_values: Array.isArray(field.domain_values) ? field.domain_values.join(',') : '',
        default_value: field.default_value || '',
        description: field.description || '',
        style_config: field.style_config ? JSON.stringify(field.style_config) : '',
      }));

      const csv = Papa.unparse(csvData);
      console.log('Configuration saved:', csv);
    } catch (error) {
      console.error('Error saving configuration:', error);
      throw error;
    }
  }

  async saveQuicklog(entries: LogEntry[]): Promise<void> {
    try {
      const csvData = entries.map(entry => {
        const { id, drillhole_id, from, to, created, modified, synced, ...rest } = entry;
        return {
          id,
          drillhole_id,
          from,
          to,
          created: created?.toISOString(),
          modified: modified?.toISOString(),
          synced: synced?.toString(),
          ...rest
        };
      });

      const csv = Papa.unparse(csvData);
      console.log('Quicklog saved:', csv);
    } catch (error) {
      console.error('Error saving quicklog:', error);
      throw error;
    }
  }

  getFields(): FieldConfig[] {
    return this.fields;
  }

  getFieldsForPage(pageName: string): FieldConfig[] {
    return this.fields.filter(field => field.page_name === pageName);
  }

  getHiddenFields(): FieldConfig[] {
    return this.fields.filter(field => field.visibility_style === 'hidden');
  }

  getPages(): PageInfo[] {
    const pagesMap = new Map<string, number>();
    this.fields.forEach(field => {
      if (field.page_name && !pagesMap.has(field.page_name)) {
        pagesMap.set(field.page_name, field.page_order);
      }
    });

    return Array.from(pagesMap.entries())
      .map(([name, order]) => ({ name, order }))
      .sort((a, b) => a.order - b.order);
  }
}

export default CSVService;
