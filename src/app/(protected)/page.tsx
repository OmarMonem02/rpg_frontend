export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold text-on-surface">Home</h1>
      <p className="max-w-2xl text-on-surface-variant">
        Welcome to RPG Hub dashboard. Use the sidebar to navigate between Home, Users, and Sellers modules.
      </p>
      <div className="glass ghost-border rounded-md border p-4">
        <h2 className="text-lg font-semibold text-on-surface">Quick Status</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Authentication is active and this page is protected by session validation.
        </p>
      </div>
    </section>
  );
}
