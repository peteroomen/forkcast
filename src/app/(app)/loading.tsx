/**
 * Instant loading skeleton shown while an (app) route's server component
 * fetches. Renders inside the persistent AppShell, so only the content area
 * flashes a skeleton — navigation feels immediate.
 */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-4 w-64" />
      <div className="mt-6 space-y-3">
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-20 w-full" />
      </div>
    </div>
  );
}
