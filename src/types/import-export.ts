export type ExportFormat = 'xlsx' | 'csv';

export type ImportExportColumn = {
  key: string;
  label: string;
  required: boolean;
  type: string;
  description: string;
  accepted_values: string[];
  reference?: string | null;
};

export type ImportExportEntity = {
  slug: string;
  label: string;
  columns: ImportExportColumn[];
  endpoints: {
    export: string;
    import: string;
    parse: string;
    template: string;
  };
};

export type ImportIssue = {
  row_number: number;
  code: string;
  message: string;
};

export type ImportPreviewRow = {
  row_number: number;
  status: 'valid' | 'restorable' | 'invalid' | 'duplicate' | 'created' | 'restored';
  severity: 'success' | 'warning' | 'error';
  data: Record<string, string | number | boolean | null>;
  issues: ImportIssue[];
  action?: 'create' | 'restore';
  record_id?: number;
};

export type ImportSummary = {
  message: string;
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  duplicate_count: number;
  created_count: number;
  restored_count: number;
  skipped_count: number;
};

export type ImportPreview = {
  message: string;
  summary: ImportSummary;
  columns: ImportExportColumn[];
  rows: ImportPreviewRow[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  duplicate_count: number;
  valid_count: number;
  invalid_count: number;
};

export type ImportResult = {
  message: string;
  summary: ImportSummary;
  columns: ImportExportColumn[];
  rows: ImportPreviewRow[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  created_count: number;
  restored_count: number;
  skipped_count: number;
  duplicate_count: number;
  valid_count: number;
  invalid_count: number;
};
