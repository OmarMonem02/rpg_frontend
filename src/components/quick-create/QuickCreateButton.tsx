"use client";

import { PlusIcon } from "@heroicons/react/24/outline";

type QuickCreateButtonProps = {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export function QuickCreateButton({
  label = "New",
  onClick,
  disabled = false,
  ariaLabel,
}: QuickCreateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className="flex items-center gap-1 rounded-md px-2 py-1 label-caps text-primary transition-colors hover:bg-primary/10 hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <PlusIcon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
