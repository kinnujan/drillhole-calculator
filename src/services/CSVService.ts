import Papa from 'papaparse';
import configurationCsv from '../assets/configuration.csv?raw';
import quicklogCsv from '../assets/quicklog.csv?raw';
import { LogEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Field, FieldConfig, PageInfo, VisibilityStyle } from '../types/Field';
import databaseService from './DatabaseService';

type CSVServiceState = {
  fields: FieldConfig[];
  configurationChangeListeners: (() => void)[];
  initialized: boolean;
};

class CSVService {
  private static instance: CSVService = new CSVService();
  
  private state: CSVServiceState = {
    fields: [],
    configurationChangeListeners: [],
    initialized: false
  };

  private constructor() {
    console.log('[CSV] Creating CSVService instance');
    // Listen for database initialization
    databaseService.addChangeListener((type, data) => {
      console.log(`[CSV] Received database event: ${type}`, data);
      if (type === 'init' && data.isEmpty) {
        console.log('[CSV] Database is empty, will load initial data');
        this.loadQuicklog().then(entries => {
          console.log(`[CSV] Loaded ${entries?.length || 0} entries from quicklog.csv`);
          if (entries && entries.length > 0) {
            console.log('[CSV] Adding entries to database...');
            entries.forEach((entry, index) => {
              console.log(`[CSV] Adding entry ${index + 1}/${entries.length}`);
              databaseService.addEntry(entry);
            });
            console.log('[CSV] Finished adding all entries to database');
          } else {
            console.log('[CSV] No entries found in quicklog.csv');
          }
        }).catch(error => {
          console.error('[CSV] Error loading quicklog:', error);
        });
      }
    });
    console.log('[CSV] CSVService initialization complete');
  }

  public addConfigurationChangeListener(listener: () => void) {
    this.state.configurationChangeListeners.push(listener);
  }

  public removeConfigurationChangeListener(listener: () => void) {
    this.state.configurationChangeListeners = this.state.configurationChangeListeners.filter(l => l !== listener);
  }

  private notifyConfigurationChange() {
    this.state.configurationChangeListeners.forEach(listener => listener());
  }

  public async loadConfiguration(): Promise<FieldConfig[]> {
    // If already initialized, just return the fields
    if (this.state.initialized) {
      console.log('[CSV] Configuration already loaded, returning cached fields');
      return [...this.state.fields];
    }

    console.log('[CSV] Loading configuration from CSV');
    try {
      const results = await this.parseCSV(configurationCsv);
      console.log(`[CSV] Parsed ${results.data.length} configuration rows`);
      
      this.state.fields = results.data
        .filter(row => row.field_name && row.field_type)
        .map(row => {
          console.log('[CSV] Processing field:', row.field_name);
          const field: FieldConfig = {
            field_name: row.field_name,
            field_type: row.field_type,
            page_name: row.page_name || 'default',
            page_order: parseInt(row.page_order) || 0,
            visibility_style: row.visibility_style || 'visible',
            required: row.required === 'true',
            domain_values: row.domain_values ? row.domain_values.split(',').map(v => v.trim()) : [],
            default_value: row.default_value || '',
            description: row.description || '',
            style_config: row.style_config ? JSON.parse(row.style_config) : {}
          };
          console.log('[CSV] Processed field config:', field);
          return field;
        });
      
      console.log(`[CSV] Processed ${this.state.fields.length} valid configuration fields`);
      this.state.initialized = true;
      this.notifyConfigurationChange();
      return [...this.state.fields];
    } catch (error) {
      console.error('[CSV] Error loading configuration:', error);
      throw new Error('Failed to load configuration');
    }
  }

  public getFields(): FieldConfig[] {
    return [...this.state.fields];
  }

  public async loadQuicklog(): Promise<LogEntry[]> {
    console.log('[CSV] Loading quicklog from CSV');
    try {
      const results = await this.parseCSV(quicklogCsv);
      console.log(`[CSV] Parsed ${results.data.length} quicklog rows`);

      const entries = results.data
        .filter(row => row.drillhole_id && row.from && row.to)
        .map(row => ({
          id: row.id || uuidv4(),
          drillhole_id: row.drillhole_id,
          from: Number(row.from),
          to: Number(row.to),
          lithology: row.lithology || '',
          color: row.color || '',
          texture: row.texture || '',
          minerals: row.minerals || '',
          mineralized: row.mineralized === 'true',
          structures: row.structures || '',
          notes: row.notes || '',
          fields: {},
          created: new Date(row.created || Date.now()),
          modified: new Date(row.modified || Date.now()),
          synced: row.synced === 'true',
          originalEntryId: row.originalEntryId || null
        }));

      console.log(`[CSV] Processed ${entries.length} valid quicklog entries`);
      return entries;
    } catch (error) {
      console.error('[CSV] Error loading quicklog:', error);
      throw new Error('Failed to load quicklog');
    }
  }

  private async parseCSV(csvContent: string): Promise<Papa.ParseResult<any>> {
    console.log('[CSV] Starting CSV parse');
    return new Promise((resolve, reject) => {
      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log(`[CSV] Parse complete: ${results.data.length} rows`);
          resolve(results);
        },
        error: (error) => {
          console.error('[CSV] Parse error:', error);
          reject(error);
        }
      });
    });
  }

  async saveQuicklog(entry: LogEntry): Promise<void> {
    try {
      await databaseService.queueEdit('add', entry);
    } catch (error) {
      console.error('Error saving quicklog:', error);
      throw error;
    }
  }

  async updateQuicklog(entry: LogEntry): Promise<void> {
    try {
      await databaseService.queueEdit('edit', entry, entry.id);
    } catch (error) {
      console.error('Error updating quicklog:', error);
      throw error;
    }
  }

  async deleteQuicklog(entry: LogEntry): Promise<void> {
    try {
      await databaseService.queueEdit('delete', entry, entry.id);
    } catch (error) {
      console.error('Error deleting quicklog:', error);
      throw error;
    }
  }

  getFieldStyle(fieldName: string, value: any): any {
    const field = this.getFields().find(f => f.field_name === fieldName);
    if (!field || !field.style_config) return {};

    if (field.field_type === 'domain' && field.style_config.values) {
      return field.style_config.values[value] || {};
    }

    return field.style_config;
  }

  public async saveConfiguration(fields: Field[]): Promise<void> {
    console.log('[CSV] Saving configuration:', fields);
    
    try {
      const csvData = fields.map(field => ({
        field_name: field.field_name,
        field_type: field.field_type,
        page_name: field.page_name || 'default',
        page_order: field.page_order?.toString() || '0',
        visibility_style: field.visibility_style || 'visible',
        required: field.required?.toString() || 'false',
        domain_values: Array.isArray(field.domain_values) ? field.domain_values.join(',') : '',
        default_value: field.default_value || '',
        description: field.description || '',
        style_config: field.style_config ? JSON.stringify(field.style_config) : '',
      }));

      const csv = Papa.unparse(csvData, {
        header: true,
        delimiter: ',',
        newline: '\n'
      });
      
      // Save the configuration to the file system
      const configPath = new URL('../assets/configuration.csv', import.meta.url).pathname;
      const encoder = new TextEncoder();
      const data = encoder.encode(csv);
      
      // Use the Vite dev server to write the file
      await fetch('/@fs' + configPath, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/csv',
        },
        body: data,
      });

      // Update the state
      this.state.fields = fields as FieldConfig[];
      this.state.initialized = true;
      
      // Notify listeners
      this.notifyConfigurationChange();
      
      console.log('[CSV] Configuration saved successfully');
    } catch (error) {
      console.error('[CSV] Error saving configuration:', error);
      throw error;
    }
  }

  public getFieldsForPage(pageName: string): FieldConfig[] {
    console.log(`[CSV] Getting fields for page: ${pageName}`);
    const fields = this.state.fields.filter(field => field.page_name === pageName);
    console.log(`[CSV] Found ${fields.length} fields for page ${pageName}:`, fields);
    return fields;
  }

  public getHiddenFields(): FieldConfig[] {
    return this.getFields().filter(field => field.visibility_style === 'hidden');
  }

  public getPages(): PageInfo[] {
    const pages = Array.from(new Set(this.state.fields.map(f => f.page_name)))
      .map(name => ({
        name,
        order: Math.min(...this.state.fields.filter(f => f.page_name === name).map(f => f.page_order))
      }))
      .sort((a, b) => a.order - b.order);
    
    console.log('[CSV] Available pages:', pages);
    return pages;
  }
}

// Create and export singleton instance
export default CSVService.instance;
