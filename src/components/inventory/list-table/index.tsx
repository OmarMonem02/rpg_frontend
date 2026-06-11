"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { DataTableCard } from "@/components/ops-ui";

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

const tdVariantClass = {
  default: "text-on-surface",
  mono: "mono-data text-xs text-on-surface-variant",
  primary: "mono-data font-semibold text-primary",
  muted: "text-xs text-on-surface-variant",
  name: "font-medium text-on-surface",
} as const;

type Align = keyof typeof alignClass;

export function InventoryListTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DataTableCard
      className={`overflow-hidden border-outline-variant/10 shadow-ambient ${className}`.trim()}
    >
      {children}
    </DataTableCard>
  );
}

export function InventoryListTableToolbar({
  label,
  count,
  total,
  children,
}: {
  label: string;
  count: number;
  total?: number;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-outline-variant/15 bg-surface-container-low px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
      <div>
        <p className="label-caps text-on-surface-variant">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-on-surface">
          {count} item{count === 1 ? "" : "s"}
          {typeof total === "number" && total !== count ? (
            <span className="ml-1.5 font-medium text-on-surface-variant">
              of {total}
            </span>
          ) : null}
        </p>
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

export function InventoryListTableScroll({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function InventoryListTableElement({
  children,
  minWidth = "720px",
}: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <table
      className="w-full text-left text-sm text-on-surface"
      style={{ minWidth }}
    >
      {children}
    </table>
  );
}

export function InventoryListTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-outline-variant/20 bg-surface-container-low text-on-surface-variant">
      {children}
    </thead>
  );
}

export function InventoryListTableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-outline-variant/5 bg-surface">
      {children}
    </tbody>
  );
}

export function InventoryListTableRow({
  editing = false,
  className = "",
  children,
}: {
  editing?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <tr
      className={`data-row group transition-[background-color,box-shadow] ${
        editing ? "bg-primary/5 ring-2 ring-inset ring-primary/20" : ""
      } ${className}`.trim()}
    >
      {children}
    </tr>
  );
}

export function InventoryListTableTh({
  align = "left",
  className = "",
  children,
}: {
  align?: Align;
  className?: string;
  children: ReactNode;
}) {
  return (
    <th
      className={`label-caps whitespace-nowrap px-4 py-3.5 md:px-5 ${alignClass[align]} ${className}`.trim()}
    >
      {children}
    </th>
  );
}

export function InventoryListTableTd({
  align = "left",
  variant = "default",
  className = "",
  children,
}: {
  align?: Align;
  variant?: keyof typeof tdVariantClass;
  className?: string;
  children: ReactNode;
}) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3.5 md:px-5 ${alignClass[align]} ${tdVariantClass[variant]} ${className}`.trim()}
    >
      {children}
    </td>
  );
}

export function InventoryItemThumbnail({
  image,
  name,
  size = "md",
}: {
  image?: string;
  name: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        className={`${sizeClass} flex-none rounded-xl border border-outline-variant/15 object-cover shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex flex-none items-center justify-center rounded-xl border border-outline-variant/15 bg-surface-container font-semibold text-on-surface-variant`}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}

export function InventoryTableSecondaryActions({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="inline-flex flex-nowrap items-center gap-0.5 whitespace-nowrap">
      {children}
    </div>
  );
}

export function InventoryTableActionLink({
  href,
  onClick,
  tone = "primary",
  children,
  hidden,
}: {
  href?: string;
  onClick?: () => void;
  tone?: "primary" | "danger";
  children: ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;

  const className =
    tone === "danger"
      ? "shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-error transition-colors hover:bg-error/8"
      : "shrink-0 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/8";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function InventoryTableActionDivider() {
  return (
    <span className="px-0.5 text-on-surface-variant/35" aria-hidden>
      ·
    </span>
  );
}

export function InventoryListTableError({
  message,
}: {
  message: string;
}) {
  return (
    <p className="mt-1.5 text-right text-xs font-medium text-error">{message}</p>
  );
}
