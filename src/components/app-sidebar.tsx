"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/components/permission-provider";
import type { ReactNode, SVGProps } from "react";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export type SidebarNavSection = {
  /** When set, labels this block (e.g. “Inventory”). Omit for top-level links. */
  title?: string;
  items: SidebarNavItem[];
};

export type SidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  userName?: string;
  brandTitle?: string;
  logoutLabel?: string;
  navSections?: SidebarNavSection[];
};

type SidebarIconProps = SVGProps<SVGSVGElement>;

function HomeIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function UsersIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  );
}

function StoreIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
      {...props}
    >
      <path d="M3 9h18l-1.6-5H4.6L3 9Z" />
      <path d="M4.2 9v2.4A2.4 2.4 0 0 0 6.6 14h.4a2.4 2.4 0 0 0 2.4-2.4A2.4 2.4 0 0 0 11.8 14h.4a2.4 2.4 0 0 0 2.4-2.4A2.4 2.4 0 0 0 17 14h.4a2.4 2.4 0 0 0 2.4-2.6V9" />
      <path d="M5.5 14v6h13v-6" />
      <path d="M9 20v-3.5h6V20" />
    </svg>
  );
}

function LogoutIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SparePartsIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function ProductsIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

function MaintenanceIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path
        fill="rgb(33, 33, 33)"
        d="M541.4 162.6C549 155 561.7 156.9 565.5 166.9C572.3 184.6 576 203.9 576 224C576 312.4 504.4 384 416 384C398.5 384 381.6 381.2 365.8 376L178.9 562.9C150.8 591 105.2 591 77.1 562.9C49 534.8 49 489.2 77.1 461.1L264 274.2C258.8 258.4 256 241.6 256 224C256 135.6 327.6 64 416 64C436.1 64 455.4 67.7 473.1 74.5C483.1 78.3 484.9 91 477.4 98.6L388.7 187.3C385.7 190.3 384 194.4 384 198.6L384 240C384 248.8 391.2 256 400 256L441.4 256C445.6 256 449.7 254.3 452.7 251.3L541.4 162.6z"
      />
    </svg>
  );
}

function BikesIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      width="24"
      height="24"
      {...props}
    >
      <path
        fill="rgb(0, 0, 0)"
        d="M280 80C266.7 80 256 90.7 256 104C256 117.3 266.7 128 280 128L336.6 128L359.1 176.7L264 248C230.6 222.9 189 208 144 208L88 208C74.7 208 64 218.7 64 232C64 245.3 74.7 256 88 256L144 256C222.5 256 287.2 315.6 295.2 392L269.8 392C258.6 332.8 206.5 288 144 288C73.3 288 16 345.3 16 416C16 486.7 73.3 544 144 544C206.5 544 258.5 499.2 269.8 440L320 440C333.3 440 344 429.3 344 416L344 393.5C344 348.4 369.7 308.1 409.5 285.8L421.6 311.9C389.2 335.1 368.1 373.1 368.1 416C368.1 486.7 425.4 544 496.1 544C566.8 544 624.1 486.7 624.1 416C624.1 345.3 566.8 288 496.1 288C485.4 288 475.1 289.3 465.2 291.8L433.8 224L488 224C501.3 224 512 213.3 512 200L512 152C512 138.7 501.3 128 488 128L434.7 128C427.8 128 421 130.2 415.5 134.4L398.4 147.2L373.8 93.9C369.9 85.4 361.4 80 352 80L280 80zM445.8 364.4L474.2 426C479.8 438 494 443.3 506 437.7C518 432.1 523.3 417.9 517.7 405.9L489.2 344.3C491.4 344.1 493.6 344 495.9 344C535.7 344 567.9 376.2 567.9 416C567.9 455.8 535.7 488 495.9 488C456.1 488 423.9 455.8 423.9 416C423.9 395.8 432.2 377.5 445.7 364.4zM144 488C104.2 488 72 455.8 72 416C72 376.2 104.2 344 144 344C175.3 344 202 364 211.9 392L144 392C130.7 392 120 402.7 120 416C120 429.3 130.7 440 144 440L211.9 440C202 468 175.3 488 144 488z"
      />
    </svg>
  );
}
function CreateIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}
function TicketsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24"
      width="24"
      viewBox="0 0 512 512"
    >
      <path
        fill="rgb(50, 50, 50)"
        d="M320 0c17.7 0 32 14.3 32 32l0 32 32 0c35.3 0 64 28.7 64 64l0 288c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 128C0 92.7 28.7 64 64 64l32 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32zm22 161.7c-10.7-7.8-25.7-5.4-33.5 5.3L189.1 331.2 137 279.1c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l72 72c5 5 11.9 7.5 18.8 7s13.4-4.1 17.5-9.8L347.3 195.2c7.8-10.7 5.4-25.7-5.3-33.5z"
      />
    </svg>
  );
}
function SettingsIcon(props: SidebarIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function SellerIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 21a8 8 0 0 0-16 0" />
      <circle cx="10" cy="8" r="5" />
      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
    </svg>
  );
}
function TransactionsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  );
}

function BrandsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      width="24"
      height="24"
      {...props}
    >
      <path d="M346.6 174.2C338.8 162.5 324.2 157.2 310.7 161.3C297.2 165.4 288 177.9 288 192L288 448C288 465.7 302.3 480 320 480C337.7 480 352 465.7 352 448L352 297.7L421.4 401.8C427.3 410.7 437.3 416 448 416C458.7 416 468.7 410.7 474.6 401.8L544 297.7L544 448C544 465.7 558.3 480 576 480C593.7 480 608 465.7 608 448L608 192C608 177.9 598.8 165.5 585.3 161.4C571.8 157.3 557.2 162.5 549.4 174.3L448 326.3L346.6 174.2zM32 160C14.3 160 0 174.3 0 192C0 209.7 14.3 224 32 224L96 224L96 448C96 465.7 110.3 480 128 480C145.7 480 160 465.7 160 448L160 224L224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160L32 160z" />
    </svg>
  );
}



function PaymentsIcon(props: SidebarIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" {...props}>
      <path
        fill=""
        d="M192 160L192 144C192 99.8 278 64 384 64C490 64 576 99.8 576 144L576 160C576 190.6 534.7 217.2 474 230.7C471.6 227.9 469.1 225.2 466.6 222.7C451.1 207.4 431.1 195.8 410.2 187.2C368.3 169.7 313.7 160.1 256 160.1C234.1 160.1 212.7 161.5 192.2 164.2C192 162.9 192 161.5 192 160.1zM496 417L496 370.8C511.1 366.9 525.3 362.3 538.2 356.9C551.4 351.4 564.3 344.7 576 336.6L576 352C576 378.8 544.5 402.5 496 417zM496 321L496 288C496 283.5 495.6 279.2 495 275C510.5 271.1 525 266.4 538.2 260.8C551.4 255.2 564.3 248.6 576 240.5L576 255.9C576 282.7 544.5 306.4 496 320.9zM64 304L64 288C64 243.8 150 208 256 208C362 208 448 243.8 448 288L448 304C448 348.2 362 384 256 384C150 384 64 348.2 64 304zM448 400C448 444.2 362 480 256 480C150 480 64 444.2 64 400L64 384.6C75.6 392.7 88.5 399.3 101.8 404.9C143.7 422.4 198.3 432 256 432C313.7 432 368.3 422.3 410.2 404.9C423.4 399.4 436.3 392.7 448 384.6L448 400zM448 480.6L448 496C448 540.2 362 576 256 576C150 576 64 540.2 64 496L64 480.6C75.6 488.7 88.5 495.3 101.8 500.9C143.7 518.4 198.3 528 256 528C313.7 528 368.3 518.3 410.2 500.9C423.4 495.4 436.3 488.7 448 480.6z"
      />
    </svg>
  );
}

function ArrowUpDownIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </svg>
  );
}

const defaultNavSections: SidebarNavSection[] = [
  {
    items: [
      { href: "/", label: "Home", icon: <HomeIcon className="h-5 w-5" /> },
    ],
  },
  {
    title: "Sales",
    items: [
      {
        href: "/inventory/sales",
        label: "All Sales",
        icon: <TransactionsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/sales/create",
        label: "Create Sale",
        icon: <CreateIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Maintenance",
    items: [
      {
        href: "/Tickets/",
        label: "Tickets",
        icon: <TicketsIcon className="h-5 w-5" />,
      },
      {
        href: "/Tickets/",
        label: "Create New",
        icon: <CreateIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        href: "/inventory/spare-parts",
        label: "Spare Parts",
        icon: <SparePartsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/products",
        label: "Products",
        icon: <ProductsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/bikes",
        label: "Bikes",
        icon: <BikesIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/maintenance-services",
        label: "Maintenance Services",
        icon: <MaintenanceIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        href: "/inventory/brands",
        label: "Brands",
        icon: <BrandsIcon className="h-5 w-5" />,
      },
      {
        href: "/data/bike-blueprints",
        label: "Bike Blueprints",
        icon: <BikesIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        href: "/data/import-export",
        label: "Import & Export",
        icon: <ArrowUpDownIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/users",
        label: "Users",
        icon: <UsersIcon className="h-5 w-5" />,
      },
      {
        href: "/sellers",
        label: "Sellers",
        icon: <SellerIcon className="h-5 w-5" />,
      },
      {
        href: "/data/payment-methods",
        label: "Payments",
        icon: <PaymentsIcon className="h-5 w-5" />,
      },
    ],
  },
];

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function isRouteActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}

export function AppSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout,
  userName = "User",
  brandTitle = "RPG System",
  logoutLabel = "Logout",
  navSections = defaultNavSections,
}: SidebarProps) {
  const pathname = usePathname();
  const permissions = usePermissions();

  const filteredNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => permissions.canAccessRoute(item.href)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-30 bg-on-surface/30 backdrop-blur-[2px] transition-opacity duration-300 ease-out md:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        className={[
          "glass ghost-border fixed inset-y-0 left-0 z-40 flex min-h-0 flex-col overflow-hidden border-r shadow-ambient",
          "transition-[width,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          isCollapsed ? "w-20" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="border-b border-outline-variant/20 px-3 py-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2">
            {!isCollapsed ? (
              <div className="flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                  Workshop Ops
                </p>
                <p className="font-display text-lg font-bold text-on-surface">
                  {brandTitle}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl border border-outline-variant/20 bg-surface-container-low text-sm font-bold text-on-surface shadow-sm hover:bg-surface-container transition-colors overflow-hidden"
                title="Expand sidebar"
              >
                <img
                  src="/favicon.ico"
                  alt="menu"
                  className="w-full h-full object-cover"
                />
              </button>
            )}
            {isMobileOpen && (
              <button
                type="button"
                className="flex items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 text-on-surface hover:bg-surface-container transition-colors md:hidden"
                onClick={onCloseMobile}
                aria-label="Close menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            )}
            {!isCollapsed && !isMobileOpen && (
              <button
                type="button"
                className="flex items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-container-low p-2.5 text-on-surface hover:bg-surface-container transition-colors hidden md:flex"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M15 18 9 12l6-6" />
                </svg>
              </button>
            )}
          </div>
          {!isCollapsed && (
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Sales, inventory, master data, and admin control.
            </p>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {filteredNavSections.map((section, sectionIndex) => (
            <div key={`nav-section-${sectionIndex}`} className="space-y-1.5">
              {sectionIndex > 0 ? (
                <div
                  className={
                    isCollapsed
                      ? "my-1 border-t border-outline-variant/20"
                      : "my-2 border-t border-outline-variant/20"
                  }
                  aria-hidden
                />
              ) : null}

              {section.title ? (
                !isCollapsed ? (
                  <p className="px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                    {section.title}
                  </p>
                ) : sectionIndex > 0 ? (
                  <span className="sr-only">{section.title}</span>
                ) : null
              ) : null}

              {section.items.map((item, index) => {
                const isActive = isRouteActive(pathname, item.href);

                return (
                  <Link
                    key={`${sectionIndex}-${item.href}-${index}`}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={[
                      "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
                      isCollapsed ? "justify-center px-0" : "px-3",
                      isActive
                        ? "bg-primary text-on-primary shadow-md scale-[1.02]"
                        : "text-on-surface hover:bg-surface-container-low",
                    ].join(" ")}
                    onClick={onCloseMobile}
                  >
                    <span
                      className={[
                        "shrink-0 transition-transform duration-200",
                        isActive ? "scale-110" : "",
                      ].join(" ")}
                    >
                      {item.icon ?? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-surface-container text-[10px] font-semibold text-on-surface-variant">
                          {item.label.charAt(0)}
                        </span>
                      )}
                    </span>
                    {!isCollapsed ? (
                      <span className="ml-3 truncate">{item.label}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="flex-shrink-0 border-t border-outline-variant/20 px-2 py-4">
          {!isCollapsed && (
            <div className="mb-4 rounded-2xl border border-outline-variant/10 bg-surface px-4 py-3 shadow-sm">
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">
                Signed in
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-on-surface">
                {userName}
              </p>
            </div>
          )}
          <button
            type="button"
            className={[
              "flex items-center justify-center rounded-xl bg-error-container text-xs font-bold text-on-error-container transition-all hover:bg-error/10 hover:text-error",
              isCollapsed ? "h-11 w-11 mx-auto p-0" : "w-full px-4 py-3",
            ].join(" ")}
            onClick={onLogout}
            title={isCollapsed ? logoutLabel : undefined}
          >
            <LogoutIcon
              className={["h-5 w-5 shrink-0", !isCollapsed ? "mr-2" : ""].join(
                " ",
              )}
            />
            {!isCollapsed && <span className="truncate">{logoutLabel}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
