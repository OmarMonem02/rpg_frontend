export type ExportColumnDef = {
  key: string;
  label: string;
  required?: boolean;
  exportOnly?: boolean;
};

export type ExportColumnContext = {
  label: string;
  columns: ExportColumnDef[];
};

export type ExportColumnCatalog = {
  import_export: Record<string, ExportColumnContext>;
  sales: ExportColumnContext;
  sale_items: ExportColumnContext;
  stocktake: ExportColumnContext;
  history: ExportColumnContext;
};
