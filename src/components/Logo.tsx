export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" className={small ? "size-7" : "size-9"} aria-hidden>
        <rect width="64" height="64" rx="14" fill="var(--brand)" />
        <g fill="none" stroke="var(--brand-ink)" strokeWidth="4" strokeLinecap="round">
          <path d="M24 14v14a6 6 0 0 0 12 0V14M30 14v36" />
          <path d="M44 14c-4 4-5 10-5 16h5v20" />
        </g>
      </svg>
      <span className={`font-display font-semibold tracking-tight ${small ? "text-xl" : "text-2xl"}`}>Forkcast</span>
    </div>
  );
}
