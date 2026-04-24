'use client';

import { usePermissions } from "@/components/permission-provider";
import {
  ActionButton,
  EmptyState,
  PageHero,
  PageShell,
  StatCard,
  StatGrid,
  SurfaceCard,
} from "@/components/ops-ui";

type Shortcut = {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
};

const operationsShortcuts: Shortcut[] = [
  {
    href: "/inventory/spare-parts",
    title: "Spare Parts",
    description: "Control stock, pricing, compatibility, and daily movement for the parts floor.",
    eyebrow: "Inventory",
  },
  {
    href: "/data/bike-blueprints",
    title: "Bike Blueprints",
    description: "Manage models and blueprint-to-spare-parts relationships for the workshop catalog.",
    eyebrow: "Master Data",
  },
  {
    href: "/inventory/bikes",
    title: "Bikes For Sale",
    description: "Review live showroom listings with pricing, mileage, and sale status.",
    eyebrow: "Showroom",
  },
  {
    href: "/inventory/products",
    title: "Products",
    description: "Operate the product catalog with stock health and commercial settings.",
    eyebrow: "Inventory",
  },
  {
    href: "/users",
    title: "Users",
    description: "Create and maintain access for admins, staff, and technicians.",
    eyebrow: "Admin",
  },
  {
    href: "/sellers",
    title: "Sellers",
    description: "Track commission-ready seller records and keep the sales roster clean.",
    eyebrow: "Admin",
  },
];

function ShortcutCard({ item }: { item: Shortcut }) {
  return (
    <a
      href={item.href}
      className="group rounded-[1.5rem] border border-outline-variant/15 bg-surface p-5 transition-colors hover:border-outline-variant/30 hover:bg-surface-container-low"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
        {item.eyebrow}
      </span>
      <h2 className="mt-3 text-xl font-semibold text-on-surface">{item.title}</h2>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{item.description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        Open module
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </span>
    </a>
  );
}

export default function HomePage() {
  const permissions = usePermissions();
  const visibleShortcuts = operationsShortcuts.filter((item) =>
    permissions.canAccessRoute(item.href),
  );

  return (
    <PageShell>
      <PageHero
        eyebrow="Operations Dashboard"
        title="Run the bike shop from one clear control room."
        description="Use this workspace as the daily launch point for inventory, blueprints, showroom listings, and admin operations. The rebuild keeps the existing routes and backend contracts, but gives every module a more intentional, production-ready surface."
        actions={
          <>
            {permissions.canAccessRoute("/inventory/spare-parts") ? (
              <ActionButton href="/inventory/spare-parts" tone="primary">
                Open Spare Parts
              </ActionButton>
            ) : null}
            {permissions.canAccessRoute("/data/bike-blueprints") ? (
              <ActionButton href="/data/bike-blueprints">Manage Blueprints</ActionButton>
            ) : null}
          </>
        }
        meta={
          <>
            <StatCard
              label="Priority Queue"
              value="3 Core modules"
              hint="Spare parts, blueprints, and showroom flows are now the anchor of the new UI system."
              tone="primary"
            />
            <StatCard
              label="Workspace Mode"
              value="Protected"
              hint="Session-aware shell with mobile navigation and stronger page hierarchy."
            />
          </>
        }
      />

      <StatGrid>
        <StatCard label="Inventory Control" value="Parts + Products" hint="Shared filters, tables, and guided CRUD flows." />
        <StatCard label="Blueprint Logic" value="Linked workflows" hint="Assign parts to bike models from either side of the relationship." />
        <StatCard label="Admin Operations" value="Users + Sellers" hint="Consistent page rhythm with cleaner forms and list surfaces." />
        <StatCard label="Design Constraint" value="No globals.css edits" hint="All improvements are done through layout, composition, and reusable components." />
      </StatGrid>

      <SurfaceCard>
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">Modules</p>
          <h2 className="mt-2 text-2xl font-semibold text-on-surface">Choose the area you want to operate next</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleShortcuts.map((item) => (
            <ShortcutCard key={item.href} item={item} />
          ))}
        </div>
      </SurfaceCard>

      <EmptyState
        title="More modules can now inherit the same page system"
        description="Brands, payment methods, maintenance services, and the remaining CRUD pages can all share the same operations-first layout language without changing the global stylesheet."
      />
    </PageShell>
  );
}
