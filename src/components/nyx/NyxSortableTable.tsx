"use client";

import { useRef, type ReactNode } from "react";
import { useNyxSortableTable } from "@/hooks/useNyxSortableTable";

type NyxSortableTableProps = {
  children: ReactNode;
  minWidth?: string;
  enabled?: boolean;
  sortable?: boolean;
  className?: string;
  /** When false, omits the outer nyx-catalog theme scope (use when parent already scopes). */
  scoped?: boolean;
};

export function NyxSortableTable({
  children,
  minWidth = "720px",
  enabled = true,
  sortable = true,
  className = "",
  scoped = true,
}: NyxSortableTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  useNyxSortableTable(tableRef, enabled && sortable);

  const tableClassName = [
    "nyx-table",
    "w-full",
    sortable ? "nyx-table-sortable" : "",
    "striped",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const table = (
    <div className="nyx-table-wrap">
      <table ref={tableRef} className={tableClassName} style={{ minWidth }}>
        {children}
      </table>
    </div>
  );

  if (!scoped) {
    return table;
  }

  return (
    <div className="nyx-catalog" data-theme="light">
      {table}
    </div>
  );
}
