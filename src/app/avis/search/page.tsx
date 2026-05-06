import { db } from '@/lib/db'
import Link from 'next/link'
import { nameToSlug, citySlugToName } from '@/lib/slug-utils'
import { CheckCircle2, ChevronRight, Search, MapPin } from 'lucide-react'
import PublicHeader from "@/components/public/public-header"

interface Props {
  searchParams: Promise<{ q?: string; city?: string }>
}

export function generateMetadata() {
  return { title: 'Recherche — Grade', robots: 'noindex' }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = '', city = '' } = await searchParams
  const query = q.trim()
  const citySlug = city ? nameToSlug(city) : undefined

  const hasQuery = query.length >= 1
  const hasCity = !!citySlug
  const nameFilter = hasQuery ? { name: { contains: query, mode: 'insensitive' as const } } : {}

  const [businesses, listings] = (hasQuery || hasCity)
    ? await Promise.all([
        db.business.findMany({
          where: { ...nameFilter, isActive: true, ...(citySlug ? { citySlug } : {}) },
          take: 50,
          orderBy: { name: 'asc' },
          select: { name: true, slug: true, city: true, citySlug: true, address: true },
        }),
        db.businessListing.findMany({
          where: { ...nameFilter, ...(citySlug ? { citySlug } : {}) },
          take: 200,
          orderBy: { name: 'asc' },
          select: { name: true, slug: true, city: true, citySlug: true, category: true, address: true },
        }),
      ])
    : [[], []]

  return (
    <>
      <PublicHeader
        breadcrumbs={[
          { label: "Annuaire", href: "/avis" },
          { label: "Recherche" },
        ]}
      />
      <main className="min-h-screen bg-[var(--color-bg-subtle)] font-sans text-[var(--color-text)] pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        {/* Search form */}
        <form action="/avis/search" className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Restaurant, pharmacie, garage…"
              autoFocus
              className="w-full pl-9 pr-4 py-3 border border-[var(--color-border)] rounded-xl bg-white text-sm focus:outline-none focus:border-[var(--color-brand-400)] shadow-sm"
            />
          </div>
          <input
            name="city"
            defaultValue={city}
            placeholder="Ville"
            className="sm:w-36 px-4 py-3 border border-[var(--color-border)] rounded-xl bg-white text-sm focus:outline-none focus:border-[var(--color-brand-400)] shadow-sm"
          />
          <button
            type="submit"
            className="bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Rechercher
          </button>
        </form>

        {!hasQuery && !hasCity ? (
          <p className="text-center text-[var(--color-text-muted)] py-16">Saisissez un nom ou une ville pour rechercher.</p>
        ) : businesses.length === 0 && listings.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">🔍</div>
            <p className="font-bold text-lg">Aucun résultat pour &ldquo;{query}&rdquo;{city ? ` à ${city}` : ''}</p>
            <p className="text-sm text-[var(--color-text-muted)]">Essayez un autre nom ou une autre ville.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-[var(--color-text-muted)] font-medium">
              {businesses.length + listings.length} résultat{businesses.length + listings.length !== 1 ? 's' : ''} pour &ldquo;{query}&rdquo;{city ? ` à ${city}` : ''}
            </p>

            {businesses.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Certifiés Grade</h2>
                {businesses.map(b => (
                  <Link
                    key={b.slug}
                    href={b.citySlug ? `/avis/${b.citySlug}/${b.slug}` : `/r/${b.slug}`}
                    className="group flex items-center justify-between p-4 bg-white border border-[var(--color-border)] rounded-2xl hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center font-black text-[var(--color-brand-600)] text-lg shrink-0">
                        {b.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold group-hover:text-[var(--color-brand-600)] transition-colors">{b.name}</div>
                        {b.address && (
                          <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {b.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Certifié
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </section>
            )}

            {listings.length > 0 && (
              <section className="space-y-3">
                {businesses.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Autres commerces</span>
                    <div className="flex-1 h-px bg-[var(--color-border)]" />
                  </div>
                )}
                {!businesses.length && <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Commerces répertoriés</h2>}
                {listings.map(l => (
                  <Link
                    key={`${l.citySlug}-${l.slug}`}
                    href={`/avis/${l.citySlug}/${l.slug}`}
                    className="group flex items-center justify-between p-4 bg-white border border-[var(--color-border)] rounded-2xl hover:shadow-md transition-all opacity-80 hover:opacity-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[var(--color-bg-muted)] flex items-center justify-center font-black text-[var(--color-text-muted)] text-lg shrink-0">
                        {l.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold group-hover:text-[var(--color-brand-600)] transition-colors">{l.name}</div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-2">
                          {l.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.address}</span>}
                          {l.category && <span className="bg-[var(--color-bg-muted)] px-1.5 py-0.5 rounded">{l.category}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:block text-xs text-[var(--color-text-muted)]">
                        {l.city || citySlugToName(l.citySlug)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
    </>
  )
}
