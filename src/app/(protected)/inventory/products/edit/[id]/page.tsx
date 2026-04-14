"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuthToken } from "@/lib/auth-session";
import { getProduct, type ProductRecord } from "@/lib/crud-api";
import { PageShell, PageHero } from "@/components/ops-ui";
import { ProductForm } from "../../ProductForm";

export default function EditProductPage() {
  const params = useParams();
  const id = Number(params.id);
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const token = getAuthToken();
        if (!token) return;
        const data = await getProduct(token, id);
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
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

  if (error || !product) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto py-24 text-center">
           <h2 className="text-2xl font-bold text-on-surface">Product Not Found</h2>
           <p className="mt-2 text-on-surface-variant">{error ?? "The product you are looking for does not exist."}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Inventory Hub"
        title={`Editing ${product.name}`}
        description="Modify product specifications, adjust stock levels, or update pricing details."
      />
      <ProductForm mode="edit" initialData={product} />
    </PageShell>
  );
}
