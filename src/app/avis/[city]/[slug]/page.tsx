import { db } from '@/lib/db'
import { after } from 'next/server'
import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin, ArrowRight, CheckCircle2, ChevronRight, Quote, AlertCircle } from 'lucide-react'
import { slugToName, citySlugToName } from '@/lib/slug-utils'
import { shouldIngestCity, ingestCity } from '@/lib/ingest'

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
        include: { criterionScores: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
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

  return {
    title: `Avis ${name} à ${cityDisplay} — Grade`,
    description: `Consultez les avis authentiques et vérifiés pour ${name} à ${cityDisplay}. Témoignages certifiés par de vrais clients.`,
    openGraph: {
      title: `Avis ${name} à ${cityDisplay}`,
      description: `Avis vérifiés pour ${name} à ${cityDisplay}`,
    },
    other: {
      'script:ld+json': JSON.stringify(structuredData),
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

  return (
    <main className="min-h-screen bg-[var(--color-bg-subtle)] pb-24 font-sans text-[var(--color-text)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name,
            ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address, addressLocality: cityDisplay } } : {}),
          }),
        }}
      />

      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="Grade" width={32} height={32} />
          </Link>
          <Link href={`/avis/${city}`} className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> Annuaire {cityDisplay}
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-0 pt-8">

        {/* Profile Card */}
        <div className="bg-white border border-[var(--color-border)] rounded-[2rem] p-6 sm:p-10 shadow-[var(--shadow-xl)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-400)] opacity-[0.07]" />
          <div className="relative z-10 flex flex-col items-center text-center gap-4">
            <div className="relative mt-4">
              <div className={`w-24 h-24 rounded-full border-4 border-white shadow-[var(--shadow-md)] flex items-center justify-center text-4xl font-black relative z-10 ring-1 ring-[var(--color-border)] ${type === 'customer' ? 'bg-white text-[var(--color-brand-600)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'}`}>
                {name.charAt(0).toUpperCase()}
              </div>
              {type === 'customer' ? (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-max px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 flex items-center gap-1.5 z-20 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Certifié Grade</span>
                </div>
              ) : (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-max px-3 py-1 rounded-full bg-[var(--color-bg-muted)] border border-[var(--color-border)] flex items-center gap-1.5 z-20 shadow-sm">
                  <span className="text-xs font-semibold text-[var(--color-text-muted)]">Non certifié</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{name}</h1>
              <p className="flex justify-center items-center gap-2 text-[var(--color-text-secondary)] font-medium text-sm">
                <MapPin className="w-4 h-4 text-[var(--color-brand-500)] shrink-0" />
                {address || cityDisplay}
              </p>
              {listing?.source && (
                <span className="inline-block text-xs font-semibold bg-[var(--color-bg-muted)] border border-[var(--color-border)] rounded-full px-3 py-1 text-[var(--color-text-muted)]">
                  Source: {listing.source === 'OSM' ? 'OpenStreetMap' : listing.source === 'SIRENE' ? 'Registre officiel SIRENE' : 'Manuel'}
                </span>
              )}

              {type === 'customer' && business!.reviews.length > 0 && (
                <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
                  <div className="flex items-end gap-2 bg-yellow-50 px-4 py-2 rounded-2xl border border-yellow-200/50">
                    <span className="text-3xl font-extrabold tabular-nums text-yellow-500">
                      {(business!.reviews.reduce((s, r) => s + r.overallScore, 0) / business!.reviews.length).toFixed(1)}
                    </span>
                    <span className="text-yellow-600/60 font-medium mb-1">/5</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-[var(--color-border)]">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-bold text-[var(--color-text-secondary)]">{business!.reviews.length} avis certifiés</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* State-specific content */}
        {type === 'customer' ? (
          <>
            <div className="mt-6">
              <Link href={`/r/${business!.slug}`} className="group flex flex-col sm:flex-row items-center justify-between p-5 rounded-[1.5rem] bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-500)] hover:from-[var(--color-brand-700)] hover:to-[var(--color-brand-600)] shadow-lg gap-4 transition-all hover:scale-[1.01]">
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

            <div className="mt-12 space-y-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {business!.reviews.map(rev => (
                    <div key={rev.id} className="p-6 rounded-[2rem] bg-white border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200">
                          <span className="text-lg font-black">{rev.overallScore}</span>
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" /> Achat Vérifié
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            {rev.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {rev.comment && (
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic border-l-4 border-[var(--color-brand-100)] pl-3 mb-4">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      )}
                      <div className="pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-x-4 gap-y-2">
                        {rev.criterionScores.map(c => (
                          <div key={c.id} className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-[var(--color-text-muted)]">{c.criterionName}</span>
                            <span className="text-sm font-bold">{c.score}/5</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
              <Link href="/register" className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-6 py-3 rounded-xl transition-colors">
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
  )
}
