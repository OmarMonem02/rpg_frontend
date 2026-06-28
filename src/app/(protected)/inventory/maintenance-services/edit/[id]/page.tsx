"use client";

import { useEffect, useState, use } from "react";
import { getAuthToken } from "@/lib/auth-session";
import { getMaintenanceService, type MaintenanceServiceRecord } from "@/lib/crud-api";
import { ServiceForm } from "../../ServiceForm";
import { PageShell } from "@/components/ops-ui";
import { usePageTitle } from "@/components/page-title-provider";

interface EditServicePageProps {
  params: Promise<{ id: string }>;
}

export default function EditServicePage({ params }: EditServicePageProps) {
  const { id } = use(params);
  const [service, setService] = useState<MaintenanceServiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(service ? `Edit ${service.name}` : null);

  useEffect(() => {
    const loadService = async () => {
      try {
        const token = getAuthToken();
        if (!token) throw new Error("Authentication required");
        const data = await getMaintenanceService(token, Number(id));
        setService(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load maintenance service");
      } finally {
        setLoading(false);
      }
    };
    loadService();
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

  if (error || !service) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="rounded-2xl border border-error/20 bg-error/10 p-6 text-center text-error">
            {error || "Maintenance service not found"}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ServiceForm mode="edit" initialData={service} />
    </PageShell>
  );
}
