export type BackupRestoreMode = "merge" | "upsert" | "replace";

export type BackupManifest = {
  version?: string;
  driver?: string;
  app_version?: string;
  created_at?: string;
  database?: string;
  migration_batch?: string;
  tables?: string;
};

export type BackupPreview = {
  manifest: BackupManifest;
  tables: string[];
  insert_statements: number;
  file_size_bytes: number;
  warnings: string[];
  compatible: boolean;
};

export type BackupImportResult = {
  message: string;
  mode: BackupRestoreMode;
  manifest: BackupManifest;
  insert_statements: number;
};
