import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Star } from "lucide-react";
import { db } from "@/lib/db";

export default async function BusinessesPage() {
  const businesses = await db.business.findMany({
    where: { isActive: true },
    include: {
      reviews: {
        where: {
          moderationStatus: "PUBLISHED",
          visibilityType: "PUBLIC",
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[var(--color-bg-subtle)] font-sans text-[var(--color-text)] pb-20">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image src="/logo.png" alt="Grade Logo" width={32} height={32} />
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            Connexion
          </Link>
        </div>
      </header>

      <div className="relative pt-16 pb-20 px-4 bg-white border-b border-[var(--color-border)] overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-brand-100)] rounded-full mix-blend-multiply blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-[var(--color-text)]">
            Découvrez des <span className="gradient-text">businesses vérifiés</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
            Explorez les fiches publiques des businesses qui collectent des avis authentiques avec Grade.
          </p>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12">
        {businesses.length === 0 ? (
          <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white p-10 text-center text-[var(--color-text-secondary)]">
            Aucun business actif pour le moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {businesses.map((business) => {
              const publishedReviews = business.reviews;
              const averageScore =
                publishedReviews.length > 0
                  ? (
                      publishedReviews.reduce((total, review) => total + review.overallScore, 0) /
                      publishedReviews.length
                    ).toFixed(1)
                  : "—";

              return (
                <Link
                  key={business.id}
                  href={`/r/${business.slug}`}
                  className="group rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text)] group-hover:text-[var(--color-brand-600)] transition-colors">
                        {business.name}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {business.address || "Adresse non renseignée"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 uppercase tracking-wider shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Vérifié
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold text-[var(--color-text)]">{averageScore}</span>
                    </div>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {publishedReviews.length} avis publiés
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm font-medium text-[var(--color-brand-600)] pt-4 border-t border-[var(--color-border)]">
                    <span>Voir la fiche</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
