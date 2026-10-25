/** Loading placeholders shown while request-time data streams in. */
export function CardSkeleton({ count = 3, height = "h-24" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton ${height}`} />
      ))}
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading trip">
      <div className="bg-hero px-4 pb-8 pt-6">
        <div className="mx-auto max-w-[640px] space-y-3">
          <div className="h-5 w-24 rounded-full bg-white/25" />
          <div className="h-8 w-3/4 rounded-xl bg-white/25" />
          <div className="h-4 w-1/2 rounded-full bg-white/20" />
        </div>
      </div>
      <div className="mx-auto max-w-[640px] px-4 pt-5">
        <CardSkeleton />
      </div>
    </div>
  );
}
