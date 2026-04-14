"use client";

import { useEffect, useState } from "react";
import { fetchImportExportEntities } from "@/lib/api/import-export";
import { getAuthToken } from "@/lib/auth-session";
import type { ImportExportEntity } from "@/types/import-export";
import { EntityCard } from "@/components/import-export/EntityCard";
import { PageHero, PageShell, SurfaceCard, InlineMessage } from "@/components/ops-ui";
import Link from "next/link";

export default function ImportExportHubPage() {
  const [entities, setEntities] = useState<ImportExportEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntities = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");
        
        const data = await fetchImportExportEntities(token);
        setEntities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load entities");
      } finally {
        setLoading(false);
      }
    };

    void loadEntities();
  }, []);

  return (
    <PageShell>
      <div className="mb-2 text-sm text-on-surface-variant flex items-center gap-2">
        <Link href="#" className="hover:text-primary transition-colors">Data</Link>
        <span>/</span>
        <span className="font-medium text-on-surface">Import & Export</span>
      </div>

      <PageHero
        title="Bulk Import & Export"
        description="Download existing operational data or upload new records in bulk across all major data models."
      />

      {error ? (
         <InlineMessage tone="danger">{error}</InlineMessage>
      ) : loading ? (
        <SurfaceCard>
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse rounded-[1.5rem] border border-outline-variant/15 bg-surface-container p-5 h-[200px]"></div>
              ))}
           </div>
        </SurfaceCard>
      ) : entities.length === 0 ? (
        <SurfaceCard>
           <div className="text-center py-10 text-on-surface-variant">No entities available for import/export.</div>
        </SurfaceCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entities.map(entity => (
            <EntityCard key={entity.slug} entity={entity} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
