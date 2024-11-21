import Papa from 'papaparse';
import { LogEntry } from '../types';

export interface FieldConfig {
  field_name: string;
  field_type: 'text' | 'number' | 'domain' | 'boolean';
  required: boolean;
  domain_values?: string[];
  default_value?: string;
  description: string;
  style_config: Record<string, any>;
}

class CSVService {
  private static instance: CSVService;
  private configurationData: FieldConfig[] = [];
  private quicklogData: LogEntry[] = [];

  private constructor() {}

  public static getInstance(): CSVService {
    if (!CSVService.instance) {
      CSVService.instance = new CSVService();
    }
    return CSVService.instance;
  }

  public async loadConfiguration(): Promise<FieldConfig[]> {
    try {
      const response = await fetch('/src/assets/configuration.csv');
      const csvText = await response.text();
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transform: (value) => {
            if (!value) return value;
            return value.trim();
          },
          complete: (results) => {
            try {
              this.configurationData = results.data.map(row => {
                // Handle style_config parsing
                let styleConfig = {};
                if (row.style_config && typeof row.style_config === 'string') {
                  try {
                    styleConfig = JSON.parse(row.style_config.replace(/'/g, '"'));
                  } catch (e) {
                    console.warn(`Failed to parse style_config for ${row.field_name}:`, e);
                  }
                }

                return {
                  field_name: row.field_name,
                  field_type: row.field_type as 'text' | 'number' | 'domain' | 'boolean',
                  required: row.required === 'true',
                  domain_values: row.domain_values ? row.domain_values.split(',').map(v => v.trim()) : undefined,
                  default_value: row.default_value || undefined,
                  description: row.description || '',
                  style_config: styleConfig
                };
              });
              resolve(this.configurationData);
            } catch (error) {
              console.error('Error processing configuration data:', error);
              reject(error);
            }
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      console.error('Error loading configuration:', error);
      throw error;
    }
  }

  public getConfiguration(): FieldConfig[] {
    return this.configurationData;
  }

  public getFieldConfig(fieldName: string): FieldConfig | undefined {
    return this.configurationData.find(config => config.field_name === fieldName);
  }

  public getFieldStyle(fieldName: string, value: any): { color?: string; icon?: string } {
    const config = this.getFieldConfig(fieldName);
    if (!config || !config.style_config) return {};

    const style: { color?: string; icon?: string } = {};
    
    if (config.style_config.colors && config.style_config.colors[value]) {
      style.color = config.style_config.colors[value];
    }
    
    if (config.style_config.icons && config.style_config.icons[value]) {
      style.icon = config.style_config.icons[value];
    }
    
    return style;
  }

  public async loadQuicklog(): Promise<LogEntry[]> {
    try {
      const response = await fetch('/src/assets/quicklog.csv');
      const csvText = await response.text();
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transform: (value) => {
            if (!value) return value;
            return value.trim();
          },
          complete: (results) => {
            try {
              this.quicklogData = results.data.map(row => ({
                id: row.id || crypto.randomUUID(),
                created: new Date(row.created || Date.now()),
                modified: new Date(row.modified || Date.now()),
                synced: row.synced === 'true',
                holeid: row.holeid,
                from: parseFloat(row.from),
                to: parseFloat(row.to),
                lithology: row.lithology,
                color: row.color,
                texture: row.texture,
                minerals: row.minerals,
                mineralized: row.mineralized === 'true',
                structures: row.structures,
                notes: row.notes
              }));
              resolve(this.quicklogData);
            } catch (error) {
              console.error('Error processing quicklog data:', error);
              reject(error);
            }
          },
          error: (error) => reject(error)
        });
      });
    } catch (error) {
      console.error('Error loading quicklog data:', error);
      throw error;
    }
  }
}

export default CSVService;
