import type { ReactNode } from "react";

export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <div className="tracking-page tracking-page-bg min-h-screen text-on-surface">
      <div className="tracking-grid-overlay pointer-events-none fixed inset-0" aria-hidden />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--color-primary)_18%,transparent)_0%,transparent_65%)] lg:h-96"
        aria-hidden
      />
      <div className="tracking-shell-inner relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </div>
    </div>
  );
}
