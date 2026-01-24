export function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="h-5 w-44 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-3 w-72 animate-pulse rounded bg-slate-100" />
      <div className="mt-6 space-y-2">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="mt-6 flex gap-2">
        <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
