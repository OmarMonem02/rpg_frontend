"use client";

import type { EntityFormProps, FieldConfig } from "./entity-form";
import { EntityDrawer } from "./entity-drawer";

export type { FieldConfig };

/** Same shell as {@link EntityDrawer}: right sidebar, portal, scroll-safe form. */
export type EntityFormModalProps = Omit<EntityFormProps, "onCancel" | "variant"> & {
  isOpen: boolean;
  onClose: () => void;
  width?: "sm" | "md" | "lg" | "xl";
};

export function EntityFormModal(props: EntityFormModalProps) {
  return <EntityDrawer {...props} />;
}
