import { db } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, ChevronRight, Star } from 'lucide-react'
import { citySlugToName } from '@/lib/slug-utils'

interface Props {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: Props) {
  const { city } = await params
  const cityDisplay = citySlugToName(city)
  return {
    title: `Avis commerces à ${cityDisplay} — Grade`,
    description: `Découvrez les avis vérifiés des commerces à ${cityDisplay}. Restaurants, boulangeries, pharmacies et plus.`,
  }
}

export default async function CityPage({ params }: Props) {
  const { city } = await params
  const cityDisplay = citySlugToName(city)

  const [customers, listings] = await Promise.all([
    db.business.findMany({
      where: { citySlug: city, isActive: true },
      include: {
        reviews: {
          where: { moderationStatus: 'PUBLISHED', visibilityType: 'PUBLIC' },
          select: { overallScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.businessListing.findMany({
      where: { citySlug: city },
      orderBy: { name: 'asc' },
      take: 100,
    }),
  ])

  return (
    <main className="min-h-screen bg-[var(--color-bg-subtle)] pb-20 font-sans text-[var(--color-text)]">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="Grade" width={32} height={32} />
          </Link>
          <Link href="/avis" className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> Toutes les villes
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative bg-white border-b border-[var(--color-border)] py-12 px-4 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-brand-100)] rounded-full blur-3xl opacity-40 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Annuaire</p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Avis vérifiés à <span className="text-[var(--color-brand-600)]">{cityDisplay}</span>
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {customers.length} commerce{customers.length !== 1 ? 's' : ''} certifié{customers.length !== 1 ? 's' : ''} · {listings.length} fiches répertoriées
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">

        {customers.length > 0 && (
          <section className="mb-12">
            <div className="flex items-end gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold">✅ Certifiés Grade</h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">Ces commerces collectent des avis vérifiés</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {customers.map(b => {
                const avg = b.reviews.length > 0
                  ? (b.reviews.reduce((s, r) => s + r.overallScore, 0) / b.reviews.length).toFixed(1)
                  : '—'
                return (
                  <Link key={b.id} href={b.citySlug ? `/avis/${b.citySlug}/${b.slug}` : `/r/${b.slug}`}
                    className="group bg-white border border-[var(--color-border)] rounded-[1.5rem] p-5 hover:shadow-lg hover:-translate-y-1 transition-all">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-base group-hover:text-[var(--color-brand-600)] transition-colors">{b.name}</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{b.address || 'Adresse non renseignée'}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full text-xs font-bold text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Certifié
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span className="font-semibold">{avg}</span>
                      <span className="text-sm text-[var(--color-text-muted)]">{b.reviews.length} avis</span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-medium text-[var(--color-brand-600)] border-t border-[var(--color-border)] pt-3">
                      <span>Voir la fiche</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {listings.length > 0 && (
          <>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Autres commerces à {cityDisplay}</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map(l => (
                  <Link key={l.id} href={`/avis/${l.citySlug}/${l.slug}`}
                    className="group bg-white border border-[var(--color-border)] rounded-[1.5rem] p-5 hover:shadow-md transition-all opacity-80 hover:opacity-100">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-sm group-hover:text-[var(--color-brand-600)] transition-colors">{l.name}</h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{l.address || l.city}</p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] border border-[var(--color-border)] px-2 py-0.5 rounded-full shrink-0">
                        {l.source}
                      </span>
                    </div>
                    {l.category && <p className="text-xs text-[var(--color-text-muted)] mb-3">{l.category}</p>}
                    <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-3">
                      <span className="italic">Pas encore sur Grade</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        {customers.length === 0 && listings.length === 0 && (
          <div className="text-center py-16 text-[var(--color-text-muted)]">
            Aucun commerce répertorié à {cityDisplay} pour l&apos;instant.
          </div>
        )}
      </div>
    </main>
  )
}
