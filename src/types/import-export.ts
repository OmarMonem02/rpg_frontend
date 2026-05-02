export type ExportFormat = 'xlsx' | 'csv';

export type ImportExportEntity = {
  slug: string;
  label: string;
  columns: string[];
  endpoints: {
    export: string;
    import: string;
    template: string;
  };
};

export type ImportResult = {
  message: string;
  created_count?: number;
  restored_count?: number;
  skipped_count?: number;
  skipped_duplicates?: string[];
  restored_records?: string[];
  errors: string[];
};
