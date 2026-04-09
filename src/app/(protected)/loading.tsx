export default function ProtectedRouteLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
      <div
        className="h-9 w-9 rounded-full border-2 border-primary/25 border-t-primary motion-safe:animate-spin"
        aria-hidden
      />
      <p className="text-sm text-on-surface-variant">Loading page…</p>
    </div>
  );
}
