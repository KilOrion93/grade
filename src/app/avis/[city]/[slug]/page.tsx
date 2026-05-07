import { db } from '@/lib/db'
import { after } from 'next/server'
import Link from 'next/link'
import { ArrowRight, AlertCircle, Quote } from 'lucide-react'
import { slugToName, citySlugToName } from '@/lib/slug-utils'
import { shouldIngestCity, ingestCity } from '@/lib/ingest'
import PublicHeader from "@/components/public/public-header"
import BusinessHero from "@/components/public/business-hero"
import BusinessIdentityCard from "@/components/public/business-identity-card"
import BusinessScorePanel from "@/components/public/business-score-panel"
import BusinessContactCard from "@/components/public/business-contact-card"
import BusinessMapPreview from "@/components/public/business-map-preview"
import BusinessTabs from "@/components/public/business-tabs"
import MobileStickyCTA from "@/components/public/mobile-sticky-cta"
import NearbyStrip from "@/components/public/nearby-strip"
import ReviewsClient from "@/components/public/reviews-client"

interface Props {
  params: Promise<{ city: string; slug: string }>
}

async function getPageData(city: string, slug: string) {
  const business = await db.business.findFirst({
    where: {
      slug,
      isActive: true,
      OR: [{ citySlug: city }, { citySlug: null }],
    },
    include: {
      reviews: {
        where: { moderationStatus: 'PUBLISHED', visibilityType: 'PUBLIC' },
        include: { criterionScores: true, response: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
      photos: { orderBy: { order: 'asc' } },
    },
  })

  if (business) return { type: 'customer' as const, business, listing: null }

  const listing = await db.businessListing.findUnique({
    where: { citySlug_slug: { citySlug: city, slug } },
  })

  if (listing) return { type: 'listed' as const, business: null, listing }

  return { type: 'unknown' as const, business: null, listing: null }
}

export async function generateMetadata({ params }: Props) {
  const { city, slug } = await params
  const { type, business, listing } = await getPageData(city, slug)

  const name = business?.name ?? listing?.name ?? slugToName(slug)
  const cityDisplay = business?.city ?? listing?.city ?? citySlugToName(city)
  const address = business?.address ?? listing?.address

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address, addressLocality: cityDisplay } } : {}),
    ...(listing?.lat ? { geo: { '@type': 'GeoCoordinates', latitude: listing.lat, longitude: listing.lng } } : {}),
    ...(type === 'customer' && business!.reviews.length > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (business!.reviews.reduce((s, r) => s + r.overallScore, 0) / business!.reviews.length).toFixed(1),
        reviewCount: business!.reviews.length,
      },
    } : {}),
  }
  void structuredData

  const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const canonicalUrl = `${BASE}/avis/${city}/${slug}`

  return {
    title: `Avis ${name} à ${cityDisplay} — Grade`,
    description: `Consultez les avis authentiques et vérifiés pour ${name} à ${cityDisplay}. Témoignages certifiés par de vrais clients.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `Avis ${name} à ${cityDisplay}`,
      description: `Avis vérifiés pour ${name} à ${cityDisplay}`,
      url: canonicalUrl,
      siteName: 'Grade',
      locale: 'fr_FR',
      type: 'website',
    },
  }
}

export default async function AvisPage({ params }: Props) {
  const { city, slug } = await params
  const { type, business, listing } = await getPageData(city, slug)

  const name = business?.name ?? listing?.name ?? slugToName(slug)
  const cityDisplay = business?.city ?? listing?.city ?? citySlugToName(city)
  const address = business?.address ?? listing?.address ?? null

  after(async () => {
    try {
      const needs = await shouldIngestCity(city)
      if (needs) await ingestCity(cityDisplay, city)
    } catch (err) {
      console.error('[avis] background ingestion failed:', err)
    }
  })

  const nearby = await db.businessListing.findMany({
    where: { citySlug: city, slug: { not: slug } },
    take: 6,
    orderBy: { createdAt: 'desc' },
    select: { name: true, slug: true, citySlug: true, category: true },
  })

  const nearbyCustomers = await db.business.findMany({
    where: { citySlug: city, slug: { not: slug }, isActive: true },
    take: 6,
    select: {
      name: true, slug: true, citySlug: true,
      reviews: { where: { moderationStatus: 'PUBLISHED', visibilityType: 'PUBLIC' }, select: { overallScore: true } },
    },
  })

  const BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    url: `${BASE}/avis/${city}/${slug}`,
    ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address, addressLocality: cityDisplay, addressCountry: 'FR' } } : {}),
    ...(listing?.lat ? { geo: { '@type': 'GeoCoordinates', latitude: listing.lat, longitude: listing.lng } } : {}),
    ...(business?.phone || listing?.phone ? { telephone: business?.phone ?? listing?.phone } : {}),
    ...(business?.website || listing?.website ? { url: business?.website ?? listing?.website } : {}),
    ...(type === 'customer' && business!.reviews.length > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (business!.reviews.reduce((s, r) => s + r.overallScore, 0) / business!.reviews.length).toFixed(1),
        reviewCount: business!.reviews.length,
        bestRating: '5',
        worstRating: '1',
      },
    } : {}),
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Avis', item: `${BASE}/avis` },
      { '@type': 'ListItem', position: 3, name: cityDisplay, item: `${BASE}/avis/${city}` },
      { '@type': 'ListItem', position: 4, name, item: `${BASE}/avis/${city}/${slug}` },
    ],
  }

  const serializedReviews = type === 'customer'
    ? business!.reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))
    : []

  // Aggregate criterion averages
  const criteriaMap = new Map<string, number[]>()
  if (type === 'customer') {
    for (const rev of business!.reviews) {
      for (const cs of rev.criterionScores) {
        const existing = criteriaMap.get(cs.criterionName) ?? []
        existing.push(cs.score)
        criteriaMap.set(cs.criterionName, existing)
      }
    }
  }
  const criteriaAverages = Array.from(criteriaMap.entries()).map(([critName, scores]) => ({
    name: critName,
    avg: scores.reduce((s, v) => s + v, 0) / scores.length,
  }))

  const photos = type === 'customer' ? business!.photos : []
  const phone = business?.phone ?? listing?.phone ?? null
  const website = business?.website ?? listing?.website ?? null
  const description = business?.description ?? null
  const logoUrl = business?.logoUrl ?? null

  const reviewCount = type === 'customer' ? business!.reviews.length : 0
  const avgScore = type === 'customer' && reviewCount > 0
    ? (business!.reviews.reduce((s, r) => s + r.overallScore, 0) / reviewCount).toFixed(1)
    : null

  // Star distribution for score panel
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = type === 'customer'
      ? business!.reviews.filter((r) => Math.round(r.overallScore) === star).length
      : 0
    return {
      star,
      count,
      percent: reviewCount > 0 ? (count / reviewCount) * 100 : 0,
    }
  })

  const reviewHref = type === 'customer' ? `/r/${business!.slug}/review` : null
  const isCustomer = type === 'customer'
  const hasHero = photos.length > 0 || !isCustomer

  // Tab definitions — only render tabs that have content
  const tabs = [
    { id: 'avis', label: 'Avis', count: reviewCount },
    ...(criteriaAverages.length > 0 ? [{ id: 'criteres', label: 'Critères' }] : []),
    ...(description || phone || website || address ? [{ id: 'infos', label: 'Infos' }] : []),
  ]

  return (
    <>
      <PublicHeader
        breadcrumbs={[
          { label: "Annuaire", href: "/avis" },
          { label: cityDisplay, href: `/avis/${city}` },
          { label: name },
        ]}
      />
      <main className="min-h-screen bg-[var(--color-bg-subtle)] pb-32 lg:pb-16 font-sans text-[var(--color-text)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />

        {/* Hero — full-bleed photos OR brand gradient fallback */}
        <BusinessHero photos={photos} name={name} />

        {/* Main grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pt-6 lg:pt-0">

            {/* MAIN col-span-8 */}
            <div className="lg:col-span-8 space-y-6">

              <BusinessIdentityCard
                name={name}
                logoUrl={logoUrl}
                address={address}
                city={cityDisplay}
                phone={phone}
                website={website}
                isCustomer={isCustomer}
                hasHero={hasHero}
              />

              {/* Tabs (only if customer with content) */}
              {isCustomer && tabs.length > 1 && <BusinessTabs tabs={tabs} />}

              {/* Listed-only banners */}
              {!isCustomer && (
                <>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Ce commerce n&apos;utilise pas encore Grade.</strong> Aucun avis certifié n&apos;est disponible. Les avis apparaîtront ici dès son activation.
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[var(--color-brand-50)] to-white border border-[var(--color-brand-200)] text-center">
                    <div className="text-4xl mb-3">🚀</div>
                    <h3 className="text-lg font-bold text-[var(--color-brand-700)] mb-2">Vous êtes le propriétaire de {name} ?</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-4 max-w-md mx-auto">
                      Activez Grade pour collecter des avis certifiés, booster votre visibilité Google et gérer votre réputation.
                    </p>
                    <Link href="/login" className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-6 py-3 rounded-xl transition-colors">
                      Activer Grade gratuitement <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </>
              )}

              {/* AVIS section */}
              {isCustomer && (
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
                      {reviewHref && (
                        <Link href={reviewHref} className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                          Laisser le premier avis <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <ReviewsClient reviews={serializedReviews} businessName={name} />
                  )}
                </section>
              )}

              {/* CRITÈRES section */}
              {isCustomer && criteriaAverages.length > 0 && (
                <section id="criteres" className="scroll-mt-32">
                  <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 sm:p-6">
                    <h2 className="text-base font-extrabold tracking-tight mb-1">Notes par critère</h2>
                    <p className="text-xs text-[var(--color-text-muted)] mb-5">Moyenne sur l&apos;ensemble des avis publiés</p>
                    <div className="flex items-end gap-3 sm:gap-4 justify-around">
                      {criteriaAverages.map((c) => (
                        <div key={c.name} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-sm font-black tabular-nums text-[var(--color-text)]">{c.avg.toFixed(1)}</span>
                          <div className="w-full rounded-t-md bg-[var(--color-bg-muted)] relative" style={{ height: '90px' }}>
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

              {/* INFOS section */}
              {isCustomer && (description || phone || website || address) && (
                <section id="infos" className="scroll-mt-32 space-y-4">
                  {description && (
                    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--color-border)]">
                      <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">À propos</h2>
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
                    </div>
                  )}
                  {/* Mobile-only contact card duplicated here so users on phone see contact in Infos tab */}
                  <div className="lg:hidden">
                    <BusinessContactCard phone={phone} website={website} address={address} city={cityDisplay} />
                  </div>
                  <div className="lg:hidden">
                    <BusinessMapPreview lat={null} lng={null} address={address} city={cityDisplay} name={name} />
                  </div>
                </section>
              )}
            </div>

            {/* SIDEBAR col-span-4 — desktop only */}
            <aside className="hidden lg:block lg:col-span-4">
              <div className="sticky top-20 space-y-4">
                <BusinessScorePanel
                  avgScore={avgScore}
                  reviewCount={reviewCount}
                  distribution={distribution}
                  reviewHref={reviewHref}
                  businessName={name}
                  isCustomer={isCustomer}
                />
                <BusinessContactCard phone={phone} website={website} address={address} city={cityDisplay} />
                <BusinessMapPreview lat={listing?.lat ?? null} lng={listing?.lng ?? null} address={address} city={cityDisplay} name={name} />
              </div>
            </aside>
          </div>

          {/* Mobile inline score (between identity and tabs would be ideal, here below for now) — only when no sidebar visible */}

          {/* Nearby strip — full width below grid */}
          <NearbyStrip customers={nearbyCustomers} listings={nearby} cityName={cityDisplay} />
        </div>
      </main>

      {/* Mobile fixed bottom CTA */}
      {reviewHref ? (
        <MobileStickyCTA href={reviewHref} label={`Laisser un avis`} helperText="Reçu requis · 100% gratuit" />
      ) : (
        <MobileStickyCTA href="/login" label="Activer Grade" helperText="Activation gratuite en 2 minutes" />
      )}
    </>
  )
}
