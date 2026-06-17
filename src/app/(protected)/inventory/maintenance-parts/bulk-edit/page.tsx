"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import { BulkEditWizard } from "@/app/(protected)/inventory/_components/bulk-edit/BulkEditWizard";
import type { BulkEditEntityConfig } from "@/app/(protected)/inventory/_components/bulk-edit/types";
import {
  bulkApplyMaintenanceParts,
  bulkPreviewMaintenanceParts,
  listBrands,
  listMaintenancePartCategories,
  listMaintenanceParts,
} from "@/lib/crud-api";

const maintenancePartsBulkConfig: BulkEditEntityConfig = {
  entity: "maintenance_parts",
  eyebrow: "Inventory · Maintenance parts",
  title: "Bulk edit maintenance parts",
  subtitle:
    "Select items by brand, category, currency, or search. Preview price and stock changes before applying.",
  listHref: "/inventory/maintenance-parts",
  brandType: "maintenance_parts",
  listItems: (token, page, filters) => listMaintenanceParts(token, page, filters),
  listCategories: listMaintenancePartCategories,
  listBrands: (token, page) => listBrands(token, page, { type: "maintenance_parts" }),
  preview: bulkPreviewMaintenanceParts,
  apply: bulkApplyMaintenanceParts,
};

export default function MaintenancePartsBulkEditPage() {
  const router = useRouter();
  const permissions = usePermissions();
  const canUpdate = permissions.canUpdate("maintenance-parts");

  useEffect(() => {
    if (!canUpdate) {
      router.replace("/inventory/maintenance-parts");
    }
  }, [canUpdate, router]);

  if (!canUpdate) {
    return null;
  }

  return <BulkEditWizard config={maintenancePartsBulkConfig} />;
}
