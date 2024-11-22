import Papa from 'papaparse';
import configurationCsv from '../assets/configuration.csv?raw';
import quicklogCsv from '../assets/quicklog.csv?raw';
import { LogEntry } from '../types';

export type VisibilityStyle = 'hidden' | 'visible' | 'buttons' | 'dropdown' | 'switch' | 'textarea';

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

export interface PageInfo {
  name: string;
  order: number;
  fields: FieldConfig[];
}

class CSVService {
  private static instance: CSVService;
  private configuration: FieldConfig[] = [];
  private pages: Map<string, PageInfo> = new Map();

  private constructor() {}

  public static getInstance(): CSVService {
    if (!CSVService.instance) {
      CSVService.instance = new CSVService();
    }
    return CSVService.instance;
  }

  public async loadConfiguration(): Promise<void> {
    const parsedConfig = Papa.parse(configurationCsv, {
      header: true,
      skipEmptyLines: true,
    });

    this.configuration = parsedConfig.data.map((row: any) => ({
      ...row,
      required: row.required === 'true',
      domain_values: row.domain_values ? row.domain_values.split(',') : [],
      style_config: row.style_config ? JSON.parse(row.style_config) : {},
      page_order: parseInt(row.page_order) || 0,
      visibility_style: row.visibility_style || 'visible',
    }));

    // Group fields by page
    const pageGroups = new Map<string, FieldConfig[]>();
    this.configuration.forEach(field => {
      const page = field.page_name || 'System';
      if (!pageGroups.has(page)) {
        pageGroups.set(page, []);
      }
      pageGroups.get(page)!.push(field);
    });

    // Create PageInfo objects
    pageGroups.forEach((fields, pageName) => {
      this.pages.set(pageName, {
        name: pageName,
        order: fields[0].page_order,
        fields: fields,
      });
    });
  }

  public getConfiguration(): FieldConfig[] {
    return this.configuration;
  }

  public getPages(): PageInfo[] {
    return Array.from(this.pages.values())
      .sort((a, b) => a.order - b.order);
  }

  public getFieldsForPage(pageName: string): FieldConfig[] {
    return this.pages.get(pageName)?.fields.filter(field => 
      field.visibility_style !== 'hidden'
    ) || [];
  }

  public getHiddenFields(): FieldConfig[] {
    return this.configuration.filter(field => 
      field.visibility_style === 'hidden'
    );
  }

  public async loadQuicklog(): Promise<LogEntry[]> {
    const result = Papa.parse(quicklogCsv, {
      header: true,
      skipEmptyLines: true,
    });

    return result.data as LogEntry[];
  }
}

export default CSVService;
