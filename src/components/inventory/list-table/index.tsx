"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { NyxSortableTable } from "@/components/nyx/NyxSortableTable";
import { DataTableCard } from "@/components/ops-ui";
import { ImageGalleryModal } from "@/components/inventory/ImageGalleryModal";
import { ImageHoverPreview } from "@/components/inventory/ImageHoverPreview";
import {
  InventoryImage,
  InventoryImagePlaceholder,
} from "@/components/inventory/InventoryImage";
import {
  getGalleryImages,
  getPrimaryImageUrl,
  type InventoryImageRecord,
} from "@/lib/inventory-images";

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
  return <div className="nyx-catalog" data-theme="light">{children}</div>;
}

export function InventoryListTableElement({
  children,
  minWidth = "720px",
  sortable = true,
  enabled = true,
}: {
  children: ReactNode;
  minWidth?: string;
  sortable?: boolean;
  enabled?: boolean;
}) {
  return (
    <NyxSortableTable
      minWidth={minWidth}
      sortable={sortable}
      enabled={enabled}
      scoped={false}
    >
      {children}
    </NyxSortableTable>
  );
}

export function InventoryListTableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function InventoryListTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
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
      className={`whitespace-nowrap ${alignClass[align]} ${className}`.trim()}
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
      className={`whitespace-nowrap ${alignClass[align]} ${tdVariantClass[variant]} ${className}`.trim()}
    >
      {children}
    </td>
  );
}

export function InventoryItemThumbnail({
  image,
  images,
  name,
  size = "md",
}: {
  image?: string;
  images?: InventoryImageRecord[];
  name: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  const placeholderClass = `${sizeClass} flex flex-none items-center justify-center rounded-xl border border-outline-variant/15 bg-surface-container font-semibold text-on-surface-variant`;
  const [galleryOpen, setGalleryOpen] = useState(false);

  const displayImage = getPrimaryImageUrl(images, image);
  const galleryImages = getGalleryImages(images, image);
  const extraCount = galleryImages.length > 1 ? galleryImages.length - 1 : 0;

  if (!displayImage) {
    return (
      <InventoryImagePlaceholder name={name} className={placeholderClass} />
    );
  }

  return (
    <>
      <div className="relative inline-flex">
        <ImageHoverPreview src={displayImage} alt={name}>
          <button
            type="button"
            className={`${sizeClass} block flex-none overflow-hidden rounded-xl border border-outline-variant/15 shadow-sm`}
            onClick={() => setGalleryOpen(true)}
            aria-label={`View photos for ${name}`}
          >
            <InventoryImage
              src={displayImage}
              alt=""
              className="h-full w-full object-cover"
              fallback={
                <InventoryImagePlaceholder
                  name={name}
                  className={`${sizeClass} flex h-full w-full items-center justify-center bg-surface-container font-semibold text-on-surface-variant`}
                />
              }
            />
          </button>
        </ImageHoverPreview>

        {extraCount > 0 ? (
          <span className="pointer-events-none absolute -bottom-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary shadow-sm">
            +{extraCount}
          </span>
        ) : null}
      </div>

      <ImageGalleryModal
        images={galleryImages}
        initialIndex={0}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        alt={name}
      />
    </>
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
