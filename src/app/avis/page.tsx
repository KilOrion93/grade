import { db } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Search } from 'lucide-react'
import { nameToSlug } from '@/lib/slug-utils'

export const metadata = {
  title: 'Annuaire des avis vérifiés — Grade',
  description: 'Trouvez des avis authentiques pour tous les commerces de France. Restaurants, pharmacies, garages et plus.',
}

const FEATURED_CITIES = [
  { name: 'Paris', emoji: '🗼' },
  { name: 'Lyon', emoji: '🏙️' },
  { name: 'Marseille', emoji: '🌊' },
  { name: 'Bordeaux', emoji: '🍷' },
  { name: 'Toulouse', emoji: '🌸' },
  { name: 'Nantes', emoji: '🏰' },
  { name: 'Strasbourg', emoji: '🎄' },
  { name: 'Montpellier', emoji: '🌞' },
  { name: 'Lille', emoji: '🍺' },
  { name: 'Nice', emoji: '☀️' },
  { name: 'Rennes', emoji: '⚓' },
  { name: 'Bagnolet', emoji: '🏘️' },
]

const CATEGORIES = [
  { label: 'Restaurant', emoji: '🍽️', value: 'restaurant' },
  { label: 'Boulangerie', emoji: '🥐', value: 'boulangerie' },
  { label: 'Pharmacie', emoji: '💊', value: 'pharmacie' },
  { label: 'Coiffeur', emoji: '✂️', value: 'coiffeur' },
  { label: 'Café', emoji: '☕', value: 'cafe' },
  { label: 'Garage', emoji: '🔧', value: 'garage' },
  { label: 'Hôtel', emoji: '🏨', value: 'hotel' },
  { label: 'Médecin', emoji: '🩺', value: 'medecin' },
]

export default async function AvisLandingPage() {
  const totalBusinesses = await db.businessListing.count()
  const totalCustomers = await db.business.count({ where: { isActive: true } })

  return (
    <main className="min-h-screen bg-[var(--color-bg-subtle)] font-sans text-[var(--color-text)] pb-20">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="Grade" width={32} height={32} />
          </Link>
          <Link href="/login" className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">Connexion</Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative bg-white border-b border-[var(--color-border)] py-16 sm:py-24 px-4 overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-brand-100)] rounded-full blur-3xl opacity-40 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            Trouvez des avis <span className="text-[var(--color-brand-600)]">vérifiés</span>
            <br className="hidden sm:block" /> près de chez vous
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] mb-2">
            {totalCustomers.toLocaleString('fr-FR')} commerces certifiés · {totalBusinesses.toLocaleString('fr-FR')} fiches répertoriées
          </p>

          <form action="/avis/search" className="flex flex-col sm:flex-row gap-3 mt-8 max-w-xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                name="q"
                placeholder="Restaurant, pharmacie, garage…"
                className="w-full pl-9 pr-4 py-3 border border-[var(--color-border)] rounded-xl bg-white text-sm focus:outline-none focus:border-[var(--color-brand-400)] shadow-sm"
              />
            </div>
            <input
              name="city"
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

          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.value}
                href={`/avis?category=${cat.value}`}
                className="bg-white border border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)] text-sm font-semibold text-[var(--color-text-secondary)] px-4 py-2 rounded-full transition-colors"
              >
                {cat.emoji} {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold">Villes populaires</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Explorez les commerces par ville</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {FEATURED_CITIES.map(city => (
            <Link
              key={city.name}
              href={`/avis/${nameToSlug(city.name)}`}
              className="group bg-white border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center text-lg shrink-0">{city.emoji}</div>
              <div>
                <div className="font-bold text-sm group-hover:text-[var(--color-brand-600)] transition-colors">{city.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                  Voir les avis <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
