"use client";

import { useCallback, useState } from "react";
import { getAuthToken } from "@/lib/auth-session";
import {
  exportReportingReport,
  type ReportingExportType,
  type ReportingFilters,
} from "@/lib/api/reporting";
import { ActionButton } from "@/components/ops-ui";

export function ReportingExportActions({
  reportType,
  filters = {},
  disabled = false,
  onError,
}: {
  reportType: ReportingExportType;
  filters?: ReportingFilters;
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");
      await exportReportingReport(token, reportType, "xlsx", filters);
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Failed to export report.",
      );
    } finally {
      setExporting(false);
    }
  }, [filters, onError, reportType]);

  return (
    <ActionButton
      variant="outline"
      disabled={disabled || exporting}
      onClick={() => void handleExport()}
    >
      {exporting ? "Exporting..." : "Export Excel"}
    </ActionButton>
  );
}
