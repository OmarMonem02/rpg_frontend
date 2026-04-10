export function SessionLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4">
      <div
        className="h-11 w-11 rounded-full border-[3px] border-primary/20 border-t-primary motion-safe:animate-spin"
        aria-hidden
      />
      <div className="text-center">
        <p className="font-display text-lg font-semibold text-on-surface">Loading your workspace System</p>
        <p className="mt-1 text-sm text-on-surface-variant">Verifying your session…</p>
      </div>
    </div>
  );
}
