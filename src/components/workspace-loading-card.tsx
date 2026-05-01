export function WorkspaceLoadingCard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass ghost-border w-full max-w-lg rounded-[2rem] border p-8 text-center shadow-ambient">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-primary/15 bg-primary-container text-sm font-bold uppercase tracking-[0.24em] text-on-primary-container overflow-hidden">
          <img
            src="/logo.ico"
            alt="menu"
            className="w-full h-full object-cover"
          />
        </div>
        <div
          className="mx-auto mt-6 h-11 w-11 rounded-full border-[3px] border-primary/20 border-t-primary motion-safe:animate-spin"
          aria-hidden
        />
        <div className="mt-6">
          <p className="font-display text-2xl font-semibold text-on-surface">
            Preparing your workshop console
          </p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Verifying your session and loading the protected workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
