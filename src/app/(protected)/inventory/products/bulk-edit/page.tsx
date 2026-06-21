"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { BulkEditWizard } from "@/app/(protected)/inventory/_components/bulk-edit/BulkEditWizard";
import type { BulkEditEntityConfig } from "@/app/(protected)/inventory/_components/bulk-edit/types";
import {
  bulkApplyProducts,
  bulkPreviewProducts,
  listBrands,
  listProductCategories,
  listProducts,
} from "@/lib/crud-api";

const productsBulkConfig: BulkEditEntityConfig = {
  entity: "products",
  moduleId: "products",
  eyebrow: "Inventory · Products",
  title: "Bulk edit products",
  subtitle:
    "Select items by brand, category, currency, or search. Preview price and stock changes before applying.",
  listHref: "/inventory/products",
  brandType: "products",
  listItems: (token, page, filters) => listProducts(token, page, filters),
  listCategories: listProductCategories,
  listBrands: (token, page) => listBrands(token, page, { type: "products" }),
  preview: bulkPreviewProducts,
  apply: bulkApplyProducts,
};

export default function ProductsBulkEditPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const canUpdate = permissions.canUpdate("products");

  useEffect(() => {
    if (!canUpdate) {
      router.replace("/inventory/products");
    }
  }, [canUpdate, router]);

  if (!canUpdate) {
    return null;
  }

  return <BulkEditWizard config={productsBulkConfig} />;
}
