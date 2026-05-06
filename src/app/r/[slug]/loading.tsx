export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] animate-pulse">
      <div className="h-16 bg-[var(--color-bg)] border-b border-[var(--color-border)]" />
      <div className="h-8 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-10 w-56 bg-[var(--color-bg-muted)] rounded-lg" />
        <div className="h-32 bg-[var(--color-bg-muted)] rounded-xl" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-[var(--color-bg-muted)] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
