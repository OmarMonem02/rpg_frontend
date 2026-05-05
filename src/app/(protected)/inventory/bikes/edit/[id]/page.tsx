"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { getBike, type BikeRecord } from "@/lib/crud-api";
import { PageShell, PageHero } from "@/components/ops-ui";
import { BikeForm } from "../../BikeForm";

export default function EditBikePage() {
  const params = useParams();
  const id = Number(params.id);
  const [bike, setBike] = useState<BikeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBike = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const data = await getBike(token, id);
        setBike(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bike details");
      } finally {
        setLoading(false);
      }
    };
    loadBike();
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

  if (error || !bike) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto py-24 text-center">
           <h2 className="text-2xl font-bold text-on-surface">Bike Listing Not Found</h2>
           <p className="mt-2 text-on-surface-variant">{error ?? "The bike listing you are looking for does not exist."}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Showroom Inventory"
        title={`Editing VIN: ${bike.vin}`}
      />
      <BikeForm mode="edit" initialData={bike} />
    </PageShell>
  );
}
