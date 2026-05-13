"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageShell, SurfaceCard } from "@/components/ops-ui";

export default function ReturnSaleItemsRedirect() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const saleId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const itemId = searchParams.get("item");

  useEffect(() => {
    if (!saleId) {
      router.replace("/inventory/sales");
      return;
    }

    const query = new URLSearchParams({ mode: "return" });
    if (itemId) query.set("item", itemId);

    router.replace(`/inventory/sales/${saleId}/manage?${query.toString()}`);
  }, [itemId, router, saleId]);

  return (
    <PageShell>
      <SurfaceCard className="min-h-[240px] flex items-center justify-center text-sm font-medium text-on-surface-variant">
        Opening the unified return workflow...
      </SurfaceCard>
    </PageShell>
  );
}
