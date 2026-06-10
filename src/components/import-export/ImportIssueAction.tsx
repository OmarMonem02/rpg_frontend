"use client";

import { ActionButton, InlineMessage } from "@/components/ops-ui";
import { usePermissions } from "@/components/permission-provider";
import { createBikeBlueprint } from "@/lib/api/bikes";
import {
  createBrand,
  createProductCategory,
  createSparePartCategory,
  normalizeBrand,
  updateBrand,
} from "@/lib/api/inventory";
import { createMaintenanceServiceSector } from "@/lib/api/maintenance";
import { authorizedFetch, asRecord, getApiErrorDetails } from "@/lib/api/core";
import { getAuthToken } from "@/lib/auth-session";
import type { BrandType } from "@/lib/brand-types";
import type { ImportIssueAction } from "@/types/import-export";
import type { PagePath } from "@/lib/permissions";
import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const BRAND_TYPE_LABELS: Record<BrandType, string> = {
  products: "products",
  spare_parts: "spare parts",
  bikes: "bikes",
};

function permissionPageForAction(action: ImportIssueAction): PagePath | null {
  switch (action.type) {
    case "create_brand":
    case "add_brand_type":
      return "brands";
    case "create_product_category":
      return "product-categories";
    case "create_spare_part_category":
      return "spare-part-categories";
    case "create_maintenance_service_sector":
      return "maintenance-services";
    case "create_bike_blueprint":
      return "bike-blueprints";
    default:
      return null;
  }
}

function actionLabel(action: ImportIssueAction): string {
  switch (action.type) {
    case "create_brand":
      return "Create brand";
    case "add_brand_type":
      return action.brand_type
        ? `Add ${BRAND_TYPE_LABELS[action.brand_type]} type`
        : "Add type";
    case "create_product_category":
      return "Create category";
    case "create_spare_part_category":
      return "Create category";
    case "create_maintenance_service_sector":
      return "Create sector";
    case "create_bike_blueprint":
      return "Create blueprint";
    default:
      return "Create";
  }
}

type ImportIssueActionButtonProps = {
  action: ImportIssueAction;
  onResolved: () => Promise<void>;
};

export function ImportIssueActionButton({ action, onResolved }: ImportIssueActionButtonProps) {
  const permissions = usePermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun =
    action.type === "add_brand_type"
      ? permissions.canUpdate("brands")
      : (() => {
          const permissionPage = permissionPageForAction(action);
          return permissionPage ? permissions.canCreate(permissionPage) : false;
        })();

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required");

      switch (action.type) {
        case "create_brand": {
          if (!action.name || !action.brand_type) {
            throw new Error("Missing brand details.");
          }
          await createBrand(token, {
            name: action.name,
            types: [action.brand_type],
          });
          break;
        }
        case "add_brand_type": {
          if (!action.brand_id || !action.brand_type) {
            throw new Error("Missing brand details.");
          }
          const brandPayload = await authorizedFetch<unknown>(`/brands/${action.brand_id}`, token);
          const brandRecord = asRecord(brandPayload);
          const brand = normalizeBrand(brandRecord.data ?? brandRecord.brand ?? brandRecord);
          await updateBrand(token, action.brand_id, {
            name: brand.name,
            types: Array.from(new Set([...brand.types, action.brand_type])),
          });
          break;
        }
        case "create_product_category": {
          if (!action.name) throw new Error("Missing category name.");
          await createProductCategory(token, { name: action.name });
          break;
        }
        case "create_spare_part_category": {
          if (!action.name) throw new Error("Missing category name.");
          await createSparePartCategory(token, { name: action.name });
          break;
        }
        case "create_maintenance_service_sector": {
          if (!action.name) throw new Error("Missing sector name.");
          await createMaintenanceServiceSector(token, { name: action.name });
          break;
        }
        case "create_bike_blueprint": {
          if (!action.brand_id || !action.model || action.year == null) {
            throw new Error("Missing blueprint details.");
          }
          await createBikeBlueprint(token, {
            brand_id: action.brand_id,
            model: action.model,
            year: action.year,
          });
          break;
        }
        default:
          throw new Error("Unsupported quick-create action.");
      }

      await onResolved();
    } catch (err) {
      const { message } = getApiErrorDetails(err, "Could not create this record.");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canRun) {
    return (
      <p className="mt-1 text-xs text-on-surface-variant">
        You do not have permission to fix this issue from here.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <ActionButton tone="primary" disabled={isLoading} onClick={() => void handleClick()}>
        {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : null}
        {actionLabel(action)}
      </ActionButton>
      {error ? (
        <InlineMessage tone="danger">{error}</InlineMessage>
      ) : null}
    </div>
  );
}
