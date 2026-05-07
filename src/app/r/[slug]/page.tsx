import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import PublicHeader from "@/components/public/public-header";
import BusinessHero from "@/components/public/business-hero";
import BusinessIdentityCard from "@/components/public/business-identity-card";
import BusinessScorePanel from "@/components/public/business-score-panel";
import BusinessContactCard from "@/components/public/business-contact-card";
import BusinessTabs from "@/components/public/business-tabs";
import MobileStickyCTA from "@/components/public/mobile-sticky-cta";
import ReviewsClient from "@/components/public/reviews-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
  });

  if (!business) return { title: "Business introuvable" };

  return {
    title: `Avis ${business.name} — Vérifié par Grade`,
    description: business.description || `Découvrez tous les avis vérifiés et authentiques pour ${business.name}.`,
  };
}

export default async function BusinessVitrinePage({ params }: PageProps) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
    include: {
      photos: { orderBy: { order: "asc" } },
    },
  });

  if (!business || !business.isActive) {
    notFound();
  }

  if (business.citySlug) {
    redirect(`/avis/${business.citySlug}/${business.slug}`);
  }

  const reviews = await db.review.findMany({
    where: {
      businessId: business.id,
      moderationStatus: "PUBLISHED",
      visibilityType: "PUBLIC",
    },
    include: {
      criterionScores: true,
      response: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const reviewCount = reviews.length;
  const avgScore = reviewCount > 0
    ? (reviews.reduce((acc, r) => acc + r.overallScore, 0) / reviewCount).toFixed(1)
    : null;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(r.overallScore) === star).length;
    return { star, count, percent: reviewCount > 0 ? (count / reviewCount) * 100 : 0 };
  });

  const criteriaMap = new Map<string, number[]>();
  for (const rev of reviews) {
    for (const cs of rev.criterionScores) {
      const existing = criteriaMap.get(cs.criterionName) ?? [];
      existing.push(cs.score);
      criteriaMap.set(cs.criterionName, existing);
    }
  }
  const criteriaAverages = Array.from(criteriaMap.entries()).map(([critName, scores]) => ({
    name: critName,
    avg: scores.reduce((s, v) => s + v, 0) / scores.length,
  }));

  const serializedReviews = reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));

  const photos = business.photos;
  const reviewHref = `/r/${business.slug}/review`;
  const hasHero = photos.length > 0 || true;

  const tabs = [
    { id: "avis", label: "Avis", count: reviewCount },
    ...(criteriaAverages.length > 0 ? [{ id: "criteres", label: "Critères" }] : []),
    ...(business.description || business.phone || business.website || business.address ? [{ id: "infos", label: "Infos" }] : []),
  ];

  return (
    <>
      <PublicHeader
        breadcrumbs={[
          { label: "Annuaire", href: "/avis" },
          { label: business.name },
        ]}
      />
      <main className="min-h-screen bg-[var(--color-bg-subtle)] pb-32 lg:pb-16 font-sans text-[var(--color-text)]">

        <BusinessHero photos={photos} name={business.name} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pt-6 lg:pt-0">

            <div className="lg:col-span-8 space-y-6">
              <BusinessIdentityCard
                name={business.name}
                logoUrl={business.logoUrl}
                address={business.address}
                city={business.city}
                phone={business.phone}
                website={business.website}
                isCustomer={true}
                hasHero={hasHero}
              />

              {tabs.length > 1 && <BusinessTabs tabs={tabs} />}

              <section id="avis" className="space-y-4 scroll-mt-32">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Expériences certifiées</h2>
                  <p className="text-[var(--color-text-secondary)] text-sm mt-1">Tous les témoignages proviennent de clients vérifiés.</p>
                </div>
                {reviewCount === 0 ? (
                  <div className="p-10 rounded-2xl bg-white border border-[var(--color-border)] text-center">
                    <div className="w-14 h-14 bg-[var(--color-bg-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
                      <Quote className="w-5 h-5 text-[var(--color-text-muted)]" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">Soyez le pionnier</h3>
                    <p className="text-[var(--color-text-secondary)] text-sm mb-4">Aucun avis publié pour le moment.</p>
                    <Link href={reviewHref} className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                      Laisser le premier avis <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <ReviewsClient reviews={serializedReviews} businessName={business.name} />
                )}
              </section>

              {criteriaAverages.length > 0 && (
                <section id="criteres" className="scroll-mt-32">
                  <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 sm:p-6">
                    <h2 className="text-base font-extrabold tracking-tight mb-1">Notes par critère</h2>
                    <p className="text-xs text-[var(--color-text-muted)] mb-5">Moyenne sur l&apos;ensemble des avis publiés</p>
                    <div className="flex items-end gap-3 sm:gap-4 justify-around">
                      {criteriaAverages.map((c) => (
                        <div key={c.name} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-sm font-black tabular-nums text-[var(--color-text)]">{c.avg.toFixed(1)}</span>
                          <div className="w-full rounded-t-md bg-[var(--color-bg-muted)] relative" style={{ height: "90px" }}>
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-[var(--color-brand-600)] to-[var(--color-brand-400)] transition-all"
                              style={{ height: `${(c.avg / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-[var(--color-text-muted)] text-center leading-tight font-medium truncate w-full">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {(business.description || business.phone || business.website || business.address) && (
                <section id="infos" className="scroll-mt-32 space-y-4">
                  {business.description && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--color-border)]">
                      <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">À propos</h2>
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{business.description}</p>
                    </div>
                  )}
                  <div className="lg:hidden">
                    <BusinessContactCard phone={business.phone} website={business.website} address={business.address} city={business.city} />
                  </div>
                </section>
              )}
            </div>

            <aside className="hidden lg:block lg:col-span-4">
              <div className="sticky top-20 space-y-4">
                <BusinessScorePanel
                  avgScore={avgScore}
                  reviewCount={reviewCount}
                  distribution={distribution}
                  reviewHref={reviewHref}
                  businessName={business.name}
                  isCustomer={true}
                />
                <BusinessContactCard phone={business.phone} website={business.website} address={business.address} city={business.city} />
              </div>
            </aside>
          </div>
        </div>
      </main>

      <MobileStickyCTA href={reviewHref} label="Laisser un avis" helperText="Reçu requis · 100% gratuit" />
    </>
  );
}
