"use client";

import { SearchableSelect } from "@/components/ops-ui";
import {
  TABLE_PAGE_SIZE_OPTIONS,
  type TablePageSize,
} from "@/hooks/useTablePageSize";

const OPTIONS = TABLE_PAGE_SIZE_OPTIONS.map((size) => ({
  value: size === "all" ? "all" : size,
  label: size === "all" ? "All" : String(size),
}));

type PageSizeSelectProps = {
  value: TablePageSize;
  onChange: (size: TablePageSize) => void;
};

export function PageSizeSelect({ value, onChange }: PageSizeSelectProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="label-caps text-on-surface-variant">Rows</span>
      <SearchableSelect
        value={value === "all" ? "all" : value}
        onChange={(v) => {
          if (v === "all") {
            onChange("all");
          } else {
            onChange(Number(v) as TablePageSize);
          }
        }}
        options={OPTIONS}
        searchable={false}
        className="form-input-base py-1.5 text-xs"
        aria-label="Items per page"
      />
    </div>
  );
}
