"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { getSparePart, type SparePartRecord } from "@/lib/crud-api";
import { PageShell, PageHero } from "@/components/ops-ui";
import { SparePartForm } from "../../SparePartForm";

export default function EditSparePartPage() {
  const params = useParams();
  const id = Number(params.id);
  const [part, setPart] = useState<SparePartRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPart = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const data = await getSparePart(token, id);
        setPart(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load spare part",
        );
      } finally {
        setLoading(false);
      }
    };
    loadPart();
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

  if (error || !part) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto py-24 text-center">
          <h2 className="text-2xl font-bold text-on-surface">
            Spare Part Not Found
          </h2>
          <p className="mt-2 text-on-surface-variant">
            {error ?? "The part you are looking for does not exist."}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero eyebrow="Inventory Control" title={`Editing ${part.name}`} />
      <SparePartForm mode="edit" initialData={part} />
    </PageShell>
  );
}
