export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] animate-pulse">
      <div className="h-16 bg-[var(--color-bg)] border-b border-[var(--color-border)]" />
      <div className="h-60 bg-[var(--color-bg-muted)]" />
      <div className="h-12 bg-[var(--color-bg)] border-b border-[var(--color-border)]" />
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 bg-[var(--color-bg-muted)] rounded-2xl" />
          <div className="h-32 bg-[var(--color-bg-muted)] rounded-2xl" />
        </div>
        <div className="h-40 bg-[var(--color-bg-muted)] rounded-2xl" />
        <div className="h-20 bg-[var(--color-bg-muted)] rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-[var(--color-bg-muted)] rounded-[2rem]" />
          ))}
        </div>
      </div>
    </div>
  );
}
