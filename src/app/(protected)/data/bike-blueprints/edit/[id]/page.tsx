"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { getBikeBlueprint, type BikeBlueprintRecord } from "@/lib/crud-api";
import { PageShell, PageHero } from "@/components/ops-ui";
import { BlueprintForm } from "../../BlueprintForm";

export default function EditBlueprintPage() {
  const params = useParams();
  const id = Number(params.id);
  const [blueprint, setBlueprint] = useState<BikeBlueprintRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBlueprint = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const data = await getBikeBlueprint(token, id);
        setBlueprint(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load blueprint details");
      } finally {
        setLoading(false);
      }
    };
    loadBlueprint();
  }, [id]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-outline-variant/30 border-t-primary" />
        </div>
      </PageShell>
    );
  }

  if (error || !blueprint) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto py-24 text-center">
           <h2 className="text-2xl font-bold text-on-surface">Blueprint Not Found</h2>
           <p className="mt-2 text-on-surface-variant">{error ?? "The blueprint you are looking for does not exist."}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Master Data"
        title={`Editing ${blueprint.model}`}
        description="Update the manufacturer, model, or production year for this model record."
      />
      <BlueprintForm mode="edit" initialData={blueprint} />
    </PageShell>
  );
}
