"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  EntityForm,
  type FieldConfig,
  type EntityFormProps,
} from "./entity-form";
import { XMarkIcon } from "@heroicons/react/24/outline";

export type { FieldConfig };

export type EntityDrawerProps = Omit<
  EntityFormProps,
  "onCancel" | "variant"
> & {
  isOpen: boolean;
  onClose: () => void;
  width?: "sm" | "md" | "lg" | "xl";
};

function getDocumentBody(): HTMLElement | null {
  return typeof document !== "undefined" ? document.body : null;
}

export function EntityDrawer({
  isOpen,
  onClose,
  width = "md",
  title,
  description,
  onSubmit,
  ...rest
}: EntityDrawerProps) {
  const portalTarget = useSyncExternalStore(
    () => () => { },
    getDocumentBody,
    () => null,
  );

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || portalTarget === null) return null;

  const widthClasses = {
    sm: "sm:w-[400px]",
    md: "sm:w-[500px] md:w-[900px]",
    lg: "sm:w-[600px] md:w-[960px]",
    xl: "sm:w-[700px] md:w-[900px]",
  };

  return createPortal(
    <div
      className="form-modal-overlay fixed inset-0 z-[100] flex justify-end p-0 transition-opacity"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`form-modal-shell w-full ${widthClasses[width]} flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden animate-slide-in-right rounded-none sm:rounded-l-[2rem] relative`}
      >
        <div className="divider relative bg-surface-container-low px-4 sm:px-6 py-4 sm:py-5 flex items-start sm:items-center justify-between shrink-0">
          <div className="flex-1 pr-4">
            <h2 className="font-display text-xl font-bold text-on-surface tracking-tight flex items-center gap-2">
              <span className="flex shrink-0 items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </span>
              {title}
            </h2>
            {description ? (
              <p className="text-sm font-medium text-on-surface-variant mt-1.5 ml-10">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            aria-label="Close drawer"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 md:p-6">
          <EntityForm
            {...rest}
            title=""
            description=""
            onCancel={onClose}
            onSubmit={onSubmit}
            variant="page"
          />
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
