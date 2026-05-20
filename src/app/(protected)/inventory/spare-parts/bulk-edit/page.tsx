"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { BulkEditWizard } from "@/app/(protected)/inventory/_components/bulk-edit/BulkEditWizard";
import type { BulkEditEntityConfig } from "@/app/(protected)/inventory/_components/bulk-edit/types";
import {
  bulkApplySpareParts,
  bulkPreviewSpareParts,
  listBrands,
  listSparePartCategories,
  listSpareParts,
} from "@/lib/crud-api";

const sparePartsBulkConfig: BulkEditEntityConfig = {
  entity: "spare_parts",
  eyebrow: "Inventory · Spare parts",
  title: "Bulk edit spare parts",
  subtitle:
    "Select items by brand, category, currency, or search. Preview price and stock changes before applying.",
  listHref: "/inventory/spare-parts",
  brandType: "spare_parts",
  listItems: (token, page, filters) => listSpareParts(token, page, filters),
  listCategories: listSparePartCategories,
  listBrands: (token, page) => listBrands(token, page, { type: "spare_parts" }),
  preview: bulkPreviewSpareParts,
  apply: bulkApplySpareParts,
};

export default function SparePartsBulkEditPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const canUpdate = permissions.canUpdate("spare-parts");

  useEffect(() => {
    if (!canUpdate) {
      router.replace("/inventory/spare-parts");
    }
  }, [canUpdate, router]);

  if (!canUpdate) {
    return null;
  }

  return <BulkEditWizard config={sparePartsBulkConfig} />;
}
