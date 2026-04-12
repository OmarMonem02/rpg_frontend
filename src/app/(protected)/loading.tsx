export default function ProtectedRouteLoading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center py-16">
      <div className="glass ghost-border w-full max-w-md rounded-[1.75rem] border p-8 text-center shadow-ambient">
        <div
          className="mx-auto h-10 w-10 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin"
          aria-hidden
        />
        <p className="mt-5 font-display text-xl font-semibold text-on-surface">Loading workspace page</p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">Bringing the next module into view.</p>
      </div>
    </div>
  );
}
