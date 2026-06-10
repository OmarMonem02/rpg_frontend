import {
  CubeIcon,
  TicketIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

const FEATURES = [
  {
    icon: CubeIcon,
    label: "Inventory & parts",
    description: "Stock, sales, and workshop catalog in one place.",
  },
  {
    icon: TicketIcon,
    label: "Service tickets",
    description: "Track jobs, tasks, and customer progress.",
  },
  {
    icon: WrenchScrewdriverIcon,
    label: "Workshop ops",
    description: "Approvals, reporting, and team workflows.",
  },
] as const;

export function LoginBrandPanel() {
  return (
    <div className="flex flex-col justify-center lg:py-4">
      <div className="mb-6 flex items-center gap-4 lg:mb-8">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/8 shadow-md shadow-primary/10 ring-1 ring-primary/20">
          <img
            src="/logo.ico"
            alt="Real Performance Garage logo"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 text-left">
          <p className="label-caps text-primary">ERP console</p>
          <h1 className="text-display-md text-on-surface">
            Real Performance Garage
            <span className="mt-0.5 block text-on-surface-variant">Workshop</span>
          </h1>
        </div>
      </div>

      <p className="text-body-sm leading-relaxed text-on-surface-variant lg:max-w-sm">
        Sign in to manage inventory, service tickets, sales, and workshop operations from the RPG control center.
      </p>

      <ul className="mt-8 hidden space-y-3 lg:block">
        {FEATURES.map(({ icon: Icon, label, description }) => (
          <li
            key={label}
            className="flex items-start gap-3 rounded-xl border border-outline-variant/15 bg-surface-container-lowest/80 px-4 py-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-on-surface">{label}</p>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
