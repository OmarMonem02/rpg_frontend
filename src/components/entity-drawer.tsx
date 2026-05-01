"use client";

import { useEffect, useState } from "react";
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

export function EntityDrawer({
  isOpen,
  onClose,
  width = "md",
  ...props
}: EntityDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!isOpen || !mounted) return null;

  const widthClasses = {
    sm: "sm:w-[400px]",
    md: "sm:w-[500px] md:w-[900px]",
    lg: "sm:w-[600px] md:w-[750px]",
    xl: "sm:w-[700px] md:w-[900px]",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end p-0 bg-on-surface/40 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${widthClasses[width]} h-screen h-[100dvh] bg-surface-container-lowest flex flex-col overflow-hidden animate-slide-in-right shadow-2xl border-l border-outline-variant/20 rounded-none sm:rounded-l-[2rem] relative`}
      >
        {/* Premium Header - Matching CatalogPickerModal */}
        <div className="relative border-b border-outline-variant/15 bg-surface-container-low px-4 sm:px-6 py-4 sm:py-5 flex items-start sm:items-center justify-between shrink-0">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="flex-1 pr-4">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-on-surface tracking-tight flex items-center gap-2">
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
              {props.title}
            </h2>
            {props.description && (
              <p className="text-sm font-medium text-on-surface-variant mt-1.5 ml-10">
                {props.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <EntityForm
            {...props}
            title="" // Hide EntityForm internal title as we have it in the drawer header
            description="" // Hide EntityForm internal description
            onCancel={onClose}
            onSubmit={async (data) => {
              await props.onSubmit(data);
              onClose();
            }}
            variant="modal"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
