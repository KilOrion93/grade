export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] animate-pulse">
      <div className="h-16 bg-[var(--color-bg)] border-b border-[var(--color-border)]" />
      <div className="h-8 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-10 w-64 bg-[var(--color-bg-muted)] rounded-lg" />
        <div className="h-24 bg-[var(--color-bg-muted)] rounded-xl" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-[var(--color-bg-muted)] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
