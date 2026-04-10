import Link from "next/link";

type Shortcut = {
  href: string;
  title: string;
  description: string;
};

const inventoryShortcuts: Shortcut[] = [
  {
    href: "/inventory/spare-parts",
    title: "Spare Parts",
    description: "Parts stock and listings",
  },
  {
    href: "/inventory/products",
    title: "Products",
    description: "Finished goods catalog",
  },
  {
    href: "/inventory/maintenance-services",
    title: "Maintenance services",
    description: "Service offerings and bookings",
  },
  {
    href: "/inventory/bikes",
    title: "Bikes",
    description: "Bike inventory and details",
  },
];

const adminShortcuts: Shortcut[] = [
  {
    href: "/users",
    title: "Users",
    description: "Accounts and roles",
  },
  {
    href: "/sellers",
    title: "Sellers",
    description: "Seller records",
  },
];

function ShortcutCard({ shortcut }: { shortcut: Shortcut }) {
  return (
    <Link
      href={shortcut.href}
      className="group glass ghost-border relative flex flex-col rounded-[var(--radius-md)] border p-4 shadow-ambient transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="font-display text-base font-semibold text-on-surface group-hover:text-primary">
        {shortcut.title}
      </span>
      <span className="mt-1 text-sm text-on-surface-variant">{shortcut.description}</span>
      <span
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-90 transition-opacity group-hover:opacity-100"
        aria-hidden
      >
        Open
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

function ShortcutSection({ heading, items }: { heading: string; items: Shortcut[] }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-on-surface-variant">{heading}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="list">
        {items.map((shortcut) => (
          <li key={shortcut.href}>
            <ShortcutCard shortcut={shortcut} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  return (
    <section className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-on-surface">Home</h1>
        <p className="max-w-2xl text-on-surface-variant">
          Jump to a module below or use the sidebar. Shortcuts match the same pages as the navigation menu.
        </p>
      </header>

      <ShortcutSection heading="Inventory" items={inventoryShortcuts} />
      <ShortcutSection heading="Admin" items={adminShortcuts} />

      <div className="glass ghost-border rounded-[var(--radius-md)] border p-4">
        <h2 className="text-lg font-semibold text-on-surface">Session</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          You are signed in. Protected routes stay available while your session is valid.
        </p>
      </div>
    </section>
  );
}
