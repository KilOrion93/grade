import { db } from '@/lib/db'
import { after } from 'next/server'
import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin, ArrowRight, CheckCircle2, ChevronRight, Quote, AlertCircle, Phone, Globe } from 'lucide-react'
import { slugToName, citySlugToName } from '@/lib/slug-utils'
import { shouldIngestCity, ingestCity } from '@/lib/ingest'
import PublicHeader from "@/components/public/public-header"
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
  const address = business?.address ?? listing?.address

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
    take: 4,
    orderBy: { createdAt: 'desc' },
    select: { name: true, slug: true, citySlug: true, category: true },
  })

  const nearbyCustomers = await db.business.findMany({
    where: { citySlug: city, slug: { not: slug }, isActive: true },
    take: 4,
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

  // Serialize reviews for client component (dates -> ISO strings)
  const serializedReviews = type === 'customer'
    ? business!.reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() }))
    : []

  // Aggregate criterion scores for bar chart
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
  const criteriaAverages = Array.from(criteriaMap.entries()).map(([name, scores]) => ({
    name,
    avg: scores.reduce((s, v) => s + v, 0) / scores.length,
  }))

  const photos = type === 'customer' ? business!.photos : []
  const phone = business?.phone ?? listing?.phone
  const website = business?.website ?? listing?.website
  const description = business?.description ?? null
  const logoUrl = business?.logoUrl ?? null

  const avgScore = type === 'customer' && business!.reviews.length > 0
    ? (business!.reviews.reduce((s, r) => s + r.overallScore, 0) / business!.reviews.length).toFixed(1)
    : null

  return (
    <>
      <PublicHeader
        breadcrumbs={[
          { label: "Annuaire", href: "/avis" },
          { label: cityDisplay, href: `/avis/${city}` },
          { label: name },
        ]}
      />
      <main className="min-h-screen bg-[var(--color-bg-subtle)] pb-24 font-sans text-[var(--color-text)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />

        {/* Photo hero — full-bleed only when photos exist */}
        {photos.length > 0 && (
          <div className="relative h-64 overflow-hidden">
            <div className={`absolute inset-0 grid h-full w-full ${photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {photos.slice(0, 3).map(photo => (
                <div key={photo.id} className="relative overflow-hidden">
                  <Image src={photo.url} alt={name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
        )}

        {/* All content constrained to max-w-4xl */}
        <div className="max-w-4xl mx-auto px-4 lg:px-0 pt-6">

          {/* Identity card */}
          <div className={`flex items-start gap-5 p-5 sm:p-6 rounded-2xl border mb-6 ${photos.length > 0 ? 'bg-white border-[var(--color-border)] shadow-sm -mt-10 relative' : 'bg-white border-[var(--color-border)] shadow-sm'}`}>
            {/* Avatar */}
            {logoUrl ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-[var(--color-border)] shadow shrink-0 relative">
                <Image src={logoUrl} alt={name} fill className="object-cover" sizes="80px" />
              </div>
            ) : (
              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0 flex items-center justify-center text-2xl sm:text-3xl font-black border shadow ${type === 'customer' ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border-[var(--color-brand-200)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">{name}</h1>
              {(address || cityDisplay) && (
                <p className="text-[var(--color-text-secondary)] text-sm flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-brand-500)] shrink-0" />
                  {address || cityDisplay}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {avgScore && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 font-black text-sm">
                    {avgScore} <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="font-normal text-yellow-600">{business!.reviews.length} avis</span>
                  </div>
                )}
                {type === 'customer' && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" /> Certifié Grade
                  </div>
                )}
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-brand-300)] transition-colors">
                    <Phone className="w-3 h-3" /> {phone}
                  </a>
                )}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-brand-300)] transition-colors">
                    <Globe className="w-3 h-3" /> Site web
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description card */}
          {description && (
            <div className="p-5 rounded-2xl bg-white border border-[var(--color-border)] mb-6">
              <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">À propos</h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
            </div>
          )}

          {/* State-specific content */}
          {type === 'customer' ? (
            <>
              {/* Criteria bar chart */}
              {criteriaAverages.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-[var(--color-border)] mb-6">
                  <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Critères</h2>
                  <div className="flex items-end gap-4 justify-around">
                    {criteriaAverages.map(c => (
                      <div key={c.name} className="flex flex-col items-center gap-1 flex-1">
                        <span className="text-xs font-bold text-[var(--color-text-secondary)]">{c.avg.toFixed(1)}</span>
                        <div className="w-full rounded-t-md bg-[var(--color-bg-muted)] relative" style={{ height: '80px' }}>
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-t-md bg-[var(--color-brand-600)]"
                            style={{ height: `${(c.avg / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] text-center leading-tight">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA banner */}
              <div className="mb-6">
                <Link href={`/r/${business!.slug}/review`} className="group flex flex-col sm:flex-row items-center justify-between p-5 rounded-[1.5rem] bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-500)] hover:from-[var(--color-brand-700)] hover:to-[var(--color-brand-600)] shadow-lg gap-4 transition-all hover:scale-[1.01]">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="hidden sm:flex w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">Vous avez visité {name} ?</h3>
                      <p className="text-blue-100 text-sm">Munissez-vous de votre reçu pour laisser un avis vérifié.</p>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[var(--color-brand-600)] font-bold flex items-center justify-center gap-2">
                    Laisser un avis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>

              {/* Reviews section */}
              <div className="space-y-6 mb-12">
                <div>
                  <h2 className="text-2xl font-extrabold">Expériences certifiées</h2>
                  <p className="text-[var(--color-text-secondary)] text-sm mt-1">Tous les témoignages proviennent de clients vérifiés.</p>
                </div>
                {business!.reviews.length === 0 ? (
                  <div className="p-10 rounded-[2rem] bg-white border border-[var(--color-border)] text-center">
                    <div className="w-14 h-14 bg-[var(--color-bg-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
                      <Quote className="w-5 h-5 text-[var(--color-text-muted)]" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">Soyez le pionnier</h3>
                    <p className="text-[var(--color-text-secondary)] text-sm">Aucun avis publié pour le moment.</p>
                  </div>
                ) : (
                  <ReviewsClient reviews={serializedReviews} businessName={name} />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Ce commerce n&apos;utilise pas encore Grade.</strong> Aucun avis certifié n&apos;est disponible. Les avis apparaîtront ici dès son activation.
                </div>
              </div>

              <div className="mt-5 p-6 rounded-[1.5rem] bg-gradient-to-br from-[var(--color-brand-50)] to-white border border-[var(--color-brand-200)] text-center">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="text-base font-bold text-[var(--color-brand-700)] mb-2">Vous êtes le propriétaire de {name} ?</h3>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4 max-w-sm mx-auto">
                  Activez Grade pour collecter des avis certifiés, booster votre visibilité Google et gérer votre réputation.
                </p>
                <Link href="/login" className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-6 py-3 rounded-xl transition-colors">
                  Activer Grade gratuitement <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="mt-5 p-10 rounded-[2rem] bg-white border border-[var(--color-border)] text-center">
                <div className="w-14 h-14 bg-[var(--color-bg-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
                  <Quote className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>
                <h3 className="text-lg font-bold mb-1">Aucun avis certifié</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Les avis apparaîtront ici une fois que {name} aura activé Grade.</p>
              </div>
            </>
          )}

          {/* Nearby section */}
          {(nearby.length > 0 || nearbyCustomers.length > 0) && (
            <div className="mt-12 space-y-4">
              <h2 className="text-xl font-extrabold">Autres commerces à {cityDisplay}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {nearbyCustomers.map(b => {
                  const avg = b.reviews.length > 0
                    ? (b.reviews.reduce((s, r) => s + r.overallScore, 0) / b.reviews.length).toFixed(1)
                    : null
                  return (
                    <Link key={b.slug} href={b.citySlug ? `/avis/${b.citySlug}/${b.slug}` : `/r/${b.slug}`}
                      className="group p-4 bg-white border border-[var(--color-border)] rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center font-black text-[var(--color-brand-600)]">
                          {b.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{b.name}</div>
                          {avg && <div className="text-xs text-yellow-600 font-semibold">⭐ {avg} · {b.reviews.length} avis</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Certifié
                      </div>
                    </Link>
                  )
                })}
                {nearby.map(l => (
                  <Link key={l.slug} href={`/avis/${l.citySlug}/${l.slug}`}
                    className="group p-4 bg-white border border-[var(--color-border)] rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-muted)] flex items-center justify-center font-black text-[var(--color-text-muted)]">
                        {l.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{l.name}</div>
                        {l.category && <div className="text-xs text-[var(--color-text-muted)]">{l.category}</div>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
