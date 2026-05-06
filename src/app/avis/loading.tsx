export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] animate-pulse">
      <div className="h-16 bg-[var(--color-bg)] border-b border-[var(--color-border)]" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div className="h-10 w-72 bg-[var(--color-bg-muted)] rounded-lg" />
        <div className="h-12 bg-[var(--color-bg-muted)] rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-[var(--color-bg-muted)] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
