import type { FieldConfig } from "@/components/entity-form";

export type QuickCreateConfig = {
  title: string;
  description?: string;
  submitLabel?: string;
  fields: FieldConfig[];
  onCreate: (data: Record<string, unknown>) => Promise<{ id: number }>;
  /** For multiselect: append id instead of replacing */
  mode?: "select" | "multiselect-append";
  /** Hide button when false */
  enabled?: boolean;
};
