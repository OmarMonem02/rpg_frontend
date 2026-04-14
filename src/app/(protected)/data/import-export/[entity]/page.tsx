"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchImportExportEntities } from "@/lib/api/import-export";
import { getAuthToken } from "@/lib/auth-session";
import type { ImportExportEntity } from "@/types/import-export";
import { PageHero, PageShell, SurfaceCard, InlineMessage, ActionButton, EmptyState } from "@/components/ops-ui";
import Link from "next/link";
import { ExportPanel } from "@/components/import-export/ExportPanel";
import { ImportPanel } from "@/components/import-export/ImportPanel";

export default function EntityImportExportPage() {
  const params = useParams();
  const router = useRouter();
  const entitySlug = params.entity as string;

  const [entity, setEntity] = useState<ImportExportEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntity = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");
        
        const data = await fetchImportExportEntities(token);
        const match = data.find(e => e.slug === entitySlug);
        
        if (match) {
            setEntity(match);
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

  if (loading) {
      return (
          <PageShell>
              <div className="flex justify-center flex-col gap-6">
                <div className="animate-pulse h-8 w-1/3 bg-surface-container rounded-lg"></div>
                <div className="animate-pulse h-[200px] w-full bg-surface-container rounded-[1.5rem]"></div>
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

  // Determine required columns easily since the prompt provided manual list but columns might not flag required natively.
  // The prompt specified certain required fields:
  const getRequiredColumns = (slug: string) => {
      if (['products', 'spare_parts'].includes(slug)) return ['name'];
      if (['maintenance_services'].includes(slug)) return ['name'];
      if (['bikes'].includes(slug)) return ['blueprint_id'];
      if (['bike_blueprints'].includes(slug)) return ['brand_id', 'model', 'year'];
      if (['brands'].includes(slug)) return ['name'];
      return [];
  };

  const requiredCols = getRequiredColumns(entity.slug);

  return (
    <PageShell>
      <div className="mb-2 text-sm text-on-surface-variant flex items-center gap-2">
        <Link href="/data/import-export" className="hover:text-primary transition-colors">Import & Export</Link>
        <span>/</span>
        <span className="font-medium text-on-surface">{entity.label}</span>
      </div>

      <PageHero
        title={`Manage ${entity.label}`}
        description="Export existing data or import bulk changes for this entity."
      />

      <div className="grid gap-6 md:grid-cols-2">
         <ExportPanel entity={entity} />
         <ImportPanel entity={entity} />
      </div>

      <SurfaceCard className="mt-6">
         <h3 className="text-xl font-semibold text-on-surface mb-4">Expected Import Columns</h3>
         <p className="text-sm text-on-surface-variant mb-4">
             Marked with a red asterisk <span className="text-error font-bold">*</span> means required.
         </p>
         
         <div className="overflow-x-auto rounded-[1.25rem] border border-outline-variant/15">
            <table className="w-full text-sm text-left">
               <thead className="bg-surface-container-low border-b border-outline-variant/15 text-on-surface font-semibold">
                   <tr>
                       <th className="px-4 py-3 border-r border-outline-variant/15 w-1/3">Column Name</th>
                       <th className="px-4 py-3">Description / Required</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                   {entity.columns.map(col => {
                       const isReq = requiredCols.includes(col);
                       return (
                           <tr key={col} className="hover:bg-surface-container-lowest transition-colors">
                               <td className="px-4 py-3 border-r border-outline-variant/15 font-mono text-xs">
                                   {col}
                               </td>
                               <td className="px-4 py-3">
                                   {isReq ? (
                                       <span className="inline-flex items-center gap-1">
                                           <span className="text-error font-bold">*</span> Required field
                                       </span>
                                   ) : (
                                       <span className="text-on-surface-variant">Optional field</span>
                                   )}
                               </td>
                           </tr>
                       );
                   })}
               </tbody>
            </table>
         </div>
      </SurfaceCard>
    </PageShell>
  );
}
