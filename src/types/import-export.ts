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
  errors: string[];
};
