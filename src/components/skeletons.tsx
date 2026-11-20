/** Loading placeholders shown while request-time data streams in. Flat bars, no animation. */
export function CardSkeleton({ count = 3, height = "h-24" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`card flex flex-col justify-center gap-2 overflow-hidden p-4 ${height}`}>
          <div className="skeleton h-3 w-2/5" />
          <div className="skeleton h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Same frame as the trip layout: sidebar column at lg, top bar, title rows, then cards. */
export function ShellSkeleton() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)]" aria-busy="true" aria-label="Loading trip">
      <div className="hidden space-y-1 px-4 pt-3 lg:block">
        <div className="skeleton mb-4 h-8 w-32" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-10 w-full rounded-full" />
        ))}
      </div>
      <div className="min-w-0">
        <div className="trip-column flex h-14 items-center justify-between">
          <div className="skeleton h-6 w-28 lg:invisible" />
          <div className="skeleton h-11 w-24 rounded-full" />
        </div>
        <div className="trip-column space-y-3 pt-2">
          <div className="skeleton h-7 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
        <div className="trip-column pt-6">
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
