/** Shown instantly while a tab loads, so a tap always does something. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-40 rounded-lg bg-surface-2" />
      <div className="mt-3 h-4 w-56 rounded bg-surface-2" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card flex items-center gap-3 p-3.5">
            <div className="size-10 shrink-0 rounded-xl bg-surface-2" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-surface-2" />
              <div className="h-3 w-1/3 rounded bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
