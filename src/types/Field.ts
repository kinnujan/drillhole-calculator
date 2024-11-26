export type VisibilityStyle = 'visible' | 'hidden' | 'buttons' | 'dropdown' | 'switch' | 'textarea';

export interface Field {
  field_name: string;
  field_type: string;
  page_name: string;
  page_order: number;
  visibility_style: VisibilityStyle;
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
