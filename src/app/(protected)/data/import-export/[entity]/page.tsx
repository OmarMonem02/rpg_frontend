"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { fetchImportExportEntities } from "@/lib/api/import-export";
import { fetchExportColumnCatalog, toExportColumnDefs } from "@/lib/api/export-columns";
import { getAuthToken } from "@/lib/auth-session";
import type { ImportExportEntity } from "@/types/import-export";
import { PageHero, PageShell, SurfaceCard, InlineMessage, ActionButton, EmptyState } from "@/components/ops-ui";
import Link from "next/link";
import { ExportPanel } from "@/components/import-export/ExportPanel";
import { ImportPanel } from "@/components/import-export/ImportPanel";
import { ExportColumnPicker } from "@/components/export/ExportColumnPicker";
import { useExportColumns } from "@/hooks/useExportColumns";
import { usePageTitle } from "@/components/page-title-provider";

export default function EntityImportExportPage() {
  const params = useParams();
  const router = useRouter();
  const entitySlug = params.entity as string;
  const permissions = usePermissions();
  const canExportData = permissions.canExport("import-export");
  const canImportData = permissions.canImport("import-export");

  const [entity, setEntity] = useState<ImportExportEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(entity ? entity.label : null);

  useEffect(() => {
    const loadEntity = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");

        const [data, catalog] = await Promise.all([
          fetchImportExportEntities(token),
          fetchExportColumnCatalog(token),
        ]);
        const match = data.find((e) => e.slug === entitySlug);

        if (match) {
          const catalogColumns = catalog.import_export[entitySlug]?.columns;
          if (catalogColumns) {
            setEntity({
              ...match,
              columns: catalogColumns.map((col) => ({
                key: col.key,
                label: col.label,
                required: col.required ?? false,
                type: match.columns.find((c) => c.key === col.key)?.type ?? "text",
                description: match.columns.find((c) => c.key === col.key)?.description ?? "",
                accepted_values: match.columns.find((c) => c.key === col.key)?.accepted_values ?? [],
                reference: match.columns.find((c) => c.key === col.key)?.reference ?? null,
                export_only: col.exportOnly,
              })),
            });
          } else {
            setEntity(match);
          }
        } else {
          setEntity(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load entity details");
      } finally {
        setLoading(false);
      }
    };

    void loadEntity();
  }, [entitySlug]);

  const allColumns = useMemo(
    () =>
      entity
        ? toExportColumnDefs(
            entity.columns.map((col) => ({
              key: col.key,
              label: col.label,
              required: col.required,
              export_only: col.export_only,
            })),
          )
        : [],
    [entity],
  );

  const selectableColumns = useMemo(
    () => allColumns.filter((col) => !col.exportOnly),
    [allColumns],
  );

  const columnState = useExportColumns(`export-cols:import-export:${entitySlug}`, selectableColumns);

  const previewColumns = useMemo(
    () =>
      columnState.visibleColumns.filter(
        (col) => !col.exportOnly && entity?.columns.some((c) => c.key === col.key),
      ),
    [columnState.visibleColumns, entity],
  );

  const referenceColumns = useMemo(() => {
    if (!entity) return [];
    const order = columnState.orderedKeys;
    return [...entity.columns]
      .filter((col) => !col.export_only)
      .sort((a, b) => {
      const aIndex = order.indexOf(a.key);
      const bIndex = order.indexOf(b.key);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [entity, columnState.orderedKeys]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex justify-center flex-col gap-6">
          <div className="animate-pulse h-8 w-1/3 bg-surface-container rounded-lg" />
          <div className="animate-pulse h-[200px] w-full bg-surface-container rounded-[1.5rem]" />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <InlineMessage tone="danger">{error}</InlineMessage>
        <div className="mt-4">
          <ActionButton onClick={() => router.back()}>Go Back</ActionButton>
        </div>
      </PageShell>
    );
  }

  if (!entity) {
    return (
      <PageShell>
        <EmptyState
          title="Entity not supported"
          description={`The entity '${entitySlug}' is not supported for import/export.`}
          action={
            <ActionButton tone="primary" href="/data/import-export">
              Back to Import & Export Hub
            </ActionButton>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-2 text-sm text-on-surface-variant flex items-center gap-2">
        <Link href="/data/import-export" className="hover:text-primary transition-colors">
          Import & Export
        </Link>
        <span>/</span>
        <span className="font-medium text-on-surface">{entity.label}</span>
      </div>

      <PageHero eyebrow="Import / Export" title={`Manage ${entity.label}`} />



      <div className="grid gap-6 md:grid-cols-1">
        {canExportData ? (
          <ExportPanel
            entity={entity}
            exportColumnsParam={() => columnState.columnsParam()}
            templateColumnsParam={() => columnState.columnsParam({ excludeExportOnly: true })}
          />
        ) : null}
        {canImportData ? (
          <ImportPanel
            entity={entity}
            previewColumns={previewColumns}
            columnsParam={() => columnState.columnsParam({ excludeExportOnly: true })}
          />
        ) : null}
      </div>
      {canExportData || canImportData ? (
        <div className="mb-6">
          <ExportColumnPicker
            collapsible
            defaultCollapsed
            allColumns={selectableColumns}
            orderedKeys={columnState.orderedKeys}
            isVisible={columnState.isVisible}
            onToggle={columnState.toggle}
            onMove={columnState.move}
            onReset={columnState.reset}
            hiddenRequiredCount={columnState.hiddenRequiredCount}
          />
        </div>
      ) : null}
      {!canExportData && !canImportData ? (
        <InlineMessage tone="warning">
          Your account can read import/export pages, but it cannot import or export data.
        </InlineMessage>
      ) : null}

      <SurfaceCard className="mt-6">
        <h3 className="text-xl font-semibold text-on-surface mb-4">Expected Import Columns</h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Templates use human-friendly names for references. Required fields are marked with a red asterisk.
        </p>

        <div className="overflow-x-auto rounded-[1.25rem] border border-outline-variant/15">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-low border-b border-outline-variant/15 text-on-surface font-semibold">
              <tr>
                <th className="px-4 py-3 border-r border-outline-variant/15 w-1/4">Column</th>
                <th className="px-4 py-3 border-r border-outline-variant/15">Description</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-on-surface">
              {referenceColumns.map((col) => (
                <tr key={col.key} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-4 py-3 border-r border-outline-variant/15 font-mono-data text-xs">
                    {col.key}
                    {col.required ? <span className="ml-1 text-error font-bold">*</span> : null}
                  </td>
                  <td className="px-4 py-3 border-r border-outline-variant/15">
                    <div className="font-medium">{col.label}</div>
                    <div className="mt-1 text-sm text-on-surface-variant">{col.description}</div>
                    {col.accepted_values.length > 0 ? (
                      <div className="mt-2 text-xs text-on-surface-variant">
                        Accepted: {col.accepted_values.join(", ")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{col.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </PageShell>
  );
}
