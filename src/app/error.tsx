"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[var(--color-bg-subtle)] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-[var(--color-brand-600)] mb-4">500</p>
        <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-3">
          Une erreur est survenue
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8">
          Quelque chose s&apos;est mal passé. Veuillez réessayer ou revenir à l&apos;accueil.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={reset}
            className="bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="text-[var(--color-brand-600)] hover:underline font-medium py-3"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
