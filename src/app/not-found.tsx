import Link from "next/link";
import PublicHeader from "@/components/public/public-header";

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-[var(--color-bg-subtle)] flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-7xl font-bold text-[var(--color-brand-600)] mb-4">404</p>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-3">
            Page introuvable
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-8">
            Cette page n&apos;existe pas ou a été déplacée.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    </>
  );
}
