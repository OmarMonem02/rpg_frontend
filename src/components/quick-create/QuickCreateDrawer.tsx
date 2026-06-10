"use client";

import { useState } from "react";
import { EntityDrawer } from "@/components/entity-drawer";
import type { FieldConfig } from "@/components/entity-form";
import { getApiErrorDetails } from "@/lib/api/core";

type QuickCreateDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  submitLabel?: string;
  heroLabel?: string;
  fields: FieldConfig[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  width?: "sm" | "md" | "lg" | "xl";
};

export function QuickCreateDrawer({
  isOpen,
  onClose,
  title,
  description,
  submitLabel = "Create & Select",
  heroLabel = "Quick Create",
  fields,
  onSubmit,
  width = "md",
}: QuickCreateDrawerProps) {
  const [error, setError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setError(undefined);
    setFieldErrors({});
    onClose();
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsLoading(true);
      setError(undefined);
      setFieldErrors({});
      await onSubmit(data);
      handleClose();
    } catch (err) {
      const { message, fieldErrors: nextFieldErrors } = getApiErrorDetails(
        err,
        "Failed to create",
      );
      setError(message);
      setFieldErrors(nextFieldErrors);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EntityDrawer
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={description}
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel={submitLabel}
      heroLabel={heroLabel}
      isLoading={isLoading}
      error={error}
      serverFieldErrors={fieldErrors}
      width={width}
    />
  );
}
