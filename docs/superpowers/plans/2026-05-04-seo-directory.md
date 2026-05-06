# SEO Directory Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Trustpilot-style directory where Grade ranks on Google for any business search — even non-customers — via on-demand generated pages at `/avis/[city]/[slug]`.

**Architecture:** Single canonical route `/avis/[city]/[slug]` serves 3 states (customer / OSM-listed / URL-generated). On first visit to any city, `after()` triggers background OSM + SIRENE ingestion. Existing `/r/[slug]` redirects 301 to new canonical URL.

**Tech Stack:** Next.js 16.2.3 App Router, Prisma 6 + PostgreSQL, Tailwind CSS v4, TypeScript 5, `after()` from `next/server` for background ingestion.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/slug-utils.ts` | Create | `nameToSlug`, `slugToName`, `generateBusinessSlug` |
| `src/lib/osm.ts` | Create | Overpass API client — fetch businesses by city |
| `src/lib/sirene.ts` | Create | SIRENE API client — French businesses |
| `src/lib/ingest.ts` | Create | Orchestrate OSM+SIRENE ingestion + DB upsert |
| `prisma/schema.prisma` | Modify | Add `BusinessListing` model + `city`/`citySlug` to `Business` |
| `src/app/avis/page.tsx` | Create | Search landing — city grid + category pills |
| `src/app/avis/[city]/page.tsx` | Create | City directory — certified first, OSM below divider |
| `src/app/avis/[city]/[slug]/page.tsx` | Create | Core SEO page — 3 states, JSON-LD, on-demand ingestion |
| `src/app/api/public/search/route.ts` | Create | Search API — `GET ?q=&city=` |
| `src/app/r/[slug]/page.tsx` | Modify | Add 301 redirect to `/avis/[citySlug]/[slug]` |
| `src/app/businesses/page.tsx` | Modify | Link cards to `/avis/[city]/[slug]` |

---

## Task 1: Slug Utilities

**Files:**
- Create: `src/lib/slug-utils.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/slug-utils.ts

export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function citySlugToName(slug: string): string {
  return slugToName(slug)
}

export function generateBusinessSlug(name: string, address?: string): string {
  const base = nameToSlug(name)
  if (!address) return base
  // Extract street name from address for disambiguation
  const streetMatch = address.match(/(\d+\s+)?(?:rue|avenue|boulevard|place|impasse|allée|chemin|route)\s+(.+?)(?:,|$)/i)
  if (streetMatch) {
    const street = nameToSlug(streetMatch[0])
    return `${base}-${street}`.replace(/-+/g, '-').slice(0, 80)
  }
  return base
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors related to `slug-utils.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/slug-utils.ts
git commit -m "feat: add slug utility functions"
```

---

## Task 2: Prisma Schema — BusinessListing + Business city fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `city` and `citySlug` fields to `Business` model**

In `prisma/schema.prisma`, find the `Business` model and add after `description String?`:

```prisma
  city       String?
  citySlug   String?
```

- [ ] **Step 2: Add `ListingSource` enum after the existing enums**

```prisma
enum ListingSource {
  OSM
  SIRENE
  MANUAL
}
```

- [ ] **Step 3: Add `BusinessListing` model before the closing of the file**

```prisma
model BusinessListing {
  id         String        @id @default(cuid())
  name       String
  slug       String
  city       String
  citySlug   String
  address    String?
  phone      String?
  website    String?
  category   String?
  source     ListingSource
  externalId String
  lat        Float?
  lng        Float?
  country    String        @default("FR")
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  @@unique([source, externalId])
  @@unique([citySlug, slug])
  @@index([citySlug])
  @@map("business_listings")
}
```

- [ ] **Step 4: Push schema to DB**

```bash
npm run db:push
```
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Verify Prisma client regenerated**

```bash
npx tsc --noEmit
```
Expected: no errors. `db.businessListing` now available on the Prisma client.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add BusinessListing model and city fields to Business"
```

---

## Task 3: OSM API Client

**Files:**
- Create: `src/lib/osm.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/osm.ts

export interface OSMBusiness {
  externalId: string
  name: string
  address?: string
  phone?: string
  website?: string
  category: string
  lat?: number
  lng?: number
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

function formatOSMAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:postcode'],
    tags['addr:city'],
  ].filter(Boolean)
  return parts.length >= 2 ? parts.join(', ') : undefined
}

function inferCategory(tags: Record<string, string>): string {
  const shop = tags.shop
  const amenity = tags.amenity
  const tourism = tags.tourism
  const mapping: Record<string, string> = {
    car_repair: 'garage', bakery: 'boulangerie', hairdresser: 'coiffeur',
    supermarket: 'supermarché', pharmacy: 'pharmacie', restaurant: 'restaurant',
    cafe: 'café', bar: 'bar', hotel: 'hôtel', doctors: 'médecin', dentist: 'dentiste',
    clothes: 'vêtements', butcher: 'boucherie', florist: 'fleuriste',
  }
  return mapping[shop] || mapping[amenity] || mapping[tourism] || shop || amenity || tourism || 'commerce'
}

export async function fetchOSMBusinesses(
  cityName: string,
  limit = 200
): Promise<OSMBusiness[]> {
  const query = `
[out:json][timeout:30];
area["name"="${cityName}"]["admin_level"~"6|7|8"]->.searchArea;
(
  nwr["name"]["shop"](area.searchArea);
  nwr["name"]["amenity"~"restaurant|cafe|bar|pharmacy|doctors|dentist|car_repair"](area.searchArea);
  nwr["name"]["tourism"="hotel"](area.searchArea);
);
out center ${limit};
`

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    console.error(`OSM fetch failed for city "${cityName}": ${res.status}`)
    return []
  }

  const data = await res.json()

  return (data.elements as any[])
    .filter(el => el.tags?.name)
    .map(el => ({
      externalId: `${el.id}`,
      name: el.tags.name as string,
      address: formatOSMAddress(el.tags),
      phone: el.tags['contact:phone'] || el.tags.phone,
      website: el.tags.website || el.tags['contact:website'],
      category: inferCategory(el.tags),
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
    }))
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/osm.ts
git commit -m "feat: add OSM Overpass API client"
```

---

## Task 4: SIRENE API Client

**Files:**
- Create: `src/lib/sirene.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/sirene.ts

export interface SIRENEBusiness {
  externalId: string
  name: string
  address?: string
  city?: string
  category?: string
  lat?: number
  lng?: number
}

const SIRENE_BASE = 'https://recherche-entreprises.api.gouv.fr'

export async function fetchSIRENEBusinesses(
  cityName: string,
  perPage = 25
): Promise<SIRENEBusiness[]> {
  const params = new URLSearchParams({
    q: cityName,
    page: '1',
    per_page: String(perPage),
    est_ouvert: 'true',
  })

  const res = await fetch(`${SIRENE_BASE}/search?${params}`, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    console.error(`SIRENE fetch failed for city "${cityName}": ${res.status}`)
    return []
  }

  const data = await res.json()

  return ((data.results as any[]) || [])
    .filter(r => r.siege?.libelle_commune?.toLowerCase() === cityName.toLowerCase())
    .map(r => {
      const siege = r.siege || {}
      const streetParts = [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean)
      return {
        externalId: r.siren,
        name: r.nom_complet || r.nom_raison_sociale || '',
        address: streetParts.length > 0
          ? `${streetParts.join(' ')}, ${siege.code_postal || ''} ${siege.libelle_commune || ''}`.trim()
          : undefined,
        city: siege.libelle_commune,
        category: r.activite_principale_libelle,
        lat: siege.latitude ? parseFloat(siege.latitude) : undefined,
        lng: siege.longitude ? parseFloat(siege.longitude) : undefined,
      }
    })
    .filter(b => b.name.length > 0)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/sirene.ts
git commit -m "feat: add SIRENE recherche-entreprises API client"
```

---

## Task 5: Ingestion Orchestrator

**Files:**
- Create: `src/lib/ingest.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/ingest.ts
import { db } from '@/lib/db'
import { fetchOSMBusinesses } from '@/lib/osm'
import { fetchSIRENEBusinesses } from '@/lib/sirene'
import { generateBusinessSlug } from '@/lib/slug-utils'
import { ListingSource } from '@prisma/client'

const INGESTION_THRESHOLD = 10

export async function shouldIngestCity(citySlug: string): Promise<boolean> {
  const count = await db.businessListing.count({ where: { citySlug } })
  return count < INGESTION_THRESHOLD
}

async function upsertListing(data: {
  name: string
  city: string
  citySlug: string
  address?: string
  phone?: string
  website?: string
  category?: string
  source: ListingSource
  externalId: string
  lat?: number
  lng?: number
  country: string
}) {
  const baseSlug = generateBusinessSlug(data.name, data.address)

  // Resolve slug conflicts (same citySlug+slug, different externalId)
  let slug = baseSlug
  let attempt = 1
  while (attempt <= 5) {
    const existing = await db.businessListing.findUnique({
      where: { citySlug_slug: { citySlug: data.citySlug, slug } },
    })
    if (!existing || existing.externalId === data.externalId) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  await db.businessListing.upsert({
    where: { source_externalId: { source: data.source, externalId: data.externalId } },
    create: { ...data, slug },
    update: {
      name: data.name,
      address: data.address,
      phone: data.phone,
      website: data.website,
      lat: data.lat,
      lng: data.lng,
    },
  })
}

export async function ingestCity(cityName: string, citySlug: string): Promise<void> {
  try {
    const [osmResults, sireneResults] = await Promise.all([
      fetchOSMBusinesses(cityName),
      fetchSIRENEBusinesses(cityName),
    ])

    for (const biz of osmResults) {
      if (!biz.name) continue
      await upsertListing({
        name: biz.name,
        city: cityName,
        citySlug,
        address: biz.address,
        phone: biz.phone,
        website: biz.website,
        category: biz.category,
        source: ListingSource.OSM,
        externalId: biz.externalId,
        lat: biz.lat,
        lng: biz.lng,
        country: 'FR',
      })
    }

    for (const biz of sireneResults) {
      if (!biz.name) continue
      await upsertListing({
        name: biz.name,
        city: biz.city || cityName,
        citySlug,
        address: biz.address,
        category: biz.category,
        source: ListingSource.SIRENE,
        externalId: biz.externalId,
        lat: biz.lat,
        lng: biz.lng,
        country: 'FR',
      })
    }
  } catch (err) {
    console.error(`[ingest] Failed for city "${cityName}":`, err)
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ingest.ts
git commit -m "feat: add city ingestion orchestrator (OSM + SIRENE)"
```

---

## Task 6: Search API

**Files:**
- Create: `src/app/api/public/search/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// src/app/api/public/search/route.ts
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { nameToSlug } from '@/lib/slug-utils'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() || ''
  const city = req.nextUrl.searchParams.get('city')?.trim() || ''

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const citySlug = city ? nameToSlug(city) : undefined

  const [listings, businesses] = await Promise.all([
    db.businessListing.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        ...(citySlug ? { citySlug } : {}),
      },
      take: 10,
      orderBy: { name: 'asc' },
      select: { name: true, slug: true, city: true, citySlug: true, category: true, address: true },
    }),
    db.business.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        isActive: true,
        ...(citySlug ? { citySlug } : {}),
      },
      take: 5,
      orderBy: { name: 'asc' },
      select: { name: true, slug: true, city: true, citySlug: true },
    }),
  ])

  const results = [
    ...businesses.map(b => ({
      name: b.name,
      slug: b.slug,
      city: b.city || '',
      citySlug: b.citySlug || '',
      isCustomer: true,
      url: b.citySlug ? `/avis/${b.citySlug}/${b.slug}` : `/r/${b.slug}`,
    })),
    ...listings.map(l => ({
      name: l.name,
      slug: l.slug,
      city: l.city,
      citySlug: l.citySlug,
      isCustomer: false,
      category: l.category,
      url: `/avis/${l.citySlug}/${l.slug}`,
    })),
  ]

  return NextResponse.json({ results })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/public/search/route.ts
git commit -m "feat: add public search API endpoint"
```

---

## Task 7: Core SEO Page `/avis/[city]/[slug]`

**Files:**
- Create: `src/app/avis/[city]/[slug]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/avis/[city]/[slug]/page.tsx
import { db } from '@/lib/db'
import { after } from 'next/server'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Star, MapPin, ArrowRight, CheckCircle2, ChevronRight, Quote, Info, AlertCircle } from 'lucide-react'
import { slugToName, citySlugToName } from '@/lib/slug-utils'
import { shouldIngestCity, ingestCity } from '@/lib/ingest'

interface Props {
  params: Promise<{ city: string; slug: string }>
}

async function getPageData(city: string, slug: string) {
  // 1. Check if Grade customer — match by slug + optional citySlug
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

  // 2. Check BusinessListing
  const listing = await db.businessListing.findUnique({
    where: { citySlug_slug: { citySlug: city, slug } },
  })

  if (listing) return { type: 'listed' as const, business: null, listing }

  // 3. Unknown — generate from URL
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
  const address = business?.address ?? listing?.address ?? listing?.address

  // Trigger background ingestion if city is under threshold
  after(async () => {
    const needs = await shouldIngestCity(city)
    if (needs) await ingestCity(cityDisplay, city)
  })

  // Nearby listings for thin-content prevention
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
      {/* JSON-LD */}
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

      {/* Header */}
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
            {/* Avatar */}
            <div className="relative mt-4">
              <div className={`w-24 h-24 rounded-full border-4 border-white shadow-[var(--shadow-md)] flex items-center justify-center text-4xl font-black relative z-10 ring-1 ring-[var(--color-border)] ${type === 'customer' ? 'bg-white text-[var(--color-brand-600)]' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'}`}>
                {name.charAt(0).toUpperCase()}
              </div>
              {type === 'customer' && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-max px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 flex items-center gap-1.5 z-20 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Certifié Grade</span>
                </div>
              )}
              {type !== 'customer' && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-max px-3 py-1 rounded-full bg-[var(--color-bg-muted)] border border-[var(--color-border)] flex items-center gap-1.5 z-20 shadow-sm">
                  <span className="text-xs font-semibold text-[var(--color-text-muted)]">Non certifié</span>
                </div>
              )}
            </div>

            {/* Info */}
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
            {/* CTA to leave review */}
            <div className="mt-6">
              <Link href={`/r/${business!.slug}/review`} className="group flex flex-col sm:flex-row items-center justify-between p-5 rounded-[1.5rem] bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-500)] hover:from-[var(--color-brand-700)] hover:to-[var(--color-brand-600)] shadow-lg gap-4 transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="hidden sm:flex w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Vous avez visité {name} ?</h3>
                    <p className="text-[var(--color-brand-50)] text-sm">Munissez-vous de votre reçu pour laisser un avis vérifié.</p>
                  </div>
                </div>
                <div className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[var(--color-brand-600)] font-bold flex items-center justify-center gap-2">
                  Laisser un avis <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>

            {/* Reviews */}
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
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">{rev.createdAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      {rev.comment && (
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic border-l-4 border-[var(--color-brand-100)] pl-3 mb-4">
                          "{rev.comment}"
                        </p>
                      )}
                      <div className="pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-x-4 gap-y-2">
                        {rev.criterionScores.map(c => (
                          <div key={c.id} className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-[var(--color-text-muted)]">{c.criterionName}</span>
                            <span className="text-sm font-bold">{c.score} <Star className="w-3 h-3 inline fill-[var(--color-border-hover)] text-[var(--color-border-hover)]" /></span>
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
            {/* Warning banner */}
            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Ce commerce n'utilise pas encore Grade.</strong> Aucun avis certifié n'est disponible. Les avis apparaîtront ici dès son activation.
              </div>
            </div>

            {/* CTA for owner */}
            <div className="mt-5 p-6 rounded-[1.5rem] bg-gradient-to-br from-[var(--color-brand-50)] to-white border border-[var(--color-brand-200)] text-center">
              <div className="text-3xl mb-3">🚀</div>
              <h3 className="text-base font-bold text-[var(--color-brand-700)] mb-2">Vous êtes le propriétaire de {name} ?</h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-4 max-w-sm mx-auto">Activez Grade pour collecter des avis certifiés, booster votre visibilité Google et gérer votre réputation.</p>
              <Link href="/onboarding" className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-6 py-3 rounded-xl transition-colors">
                Activer Grade gratuitement <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Empty state */}
            <div className="mt-5 p-10 rounded-[2rem] bg-white border border-[var(--color-border)] text-center">
              <div className="w-14 h-14 bg-[var(--color-bg-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
                <Quote className="w-5 h-5 text-[var(--color-text-muted)]" />
              </div>
              <h3 className="text-lg font-bold mb-1">Aucun avis certifié</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Les avis apparaîtront ici une fois que {name} aura activé Grade.</p>
            </div>
          </>
        )}

        {/* Nearby section — prevents thin content */}
        {(nearby.length > 0 || nearbyCustomers.length > 0) && (
          <div className="mt-12 space-y-4">
            <h2 className="text-xl font-extrabold">Autres commerces à {cityDisplay}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {nearbyCustomers.map(b => {
                const avg = b.reviews.length > 0 ? (b.reviews.reduce((s, r) => s + r.overallScore, 0) / b.reviews.length).toFixed(1) : null
                return (
                  <Link key={b.slug} href={b.citySlug ? `/avis/${b.citySlug}/${b.slug}` : `/r/${b.slug}`}
                    className="group p-4 bg-white border border-[var(--color-border)] rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center font-black text-[var(--color-brand-600)]">{b.name.charAt(0)}</div>
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
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-muted)] flex items-center justify-center font-black text-[var(--color-text-muted)]">{l.name.charAt(0)}</div>
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/avis/[city]/[slug]/page.tsx
git commit -m "feat: add on-demand SEO business page /avis/[city]/[slug]"
```

---

## Task 8: City Directory `/avis/[city]`

**Files:**
- Create: `src/app/avis/[city]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/avis/[city]/page.tsx
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
            Avis vérifiés à <span className="gradient-text">{cityDisplay}</span>
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {customers.length} commerce{customers.length !== 1 ? 's' : ''} certifié{customers.length !== 1 ? 's' : ''} · {listings.length} fiches répertoriées
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">

        {/* Certified */}
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

        {/* Divider */}
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
            Aucun commerce répertorié à {cityDisplay} pour l'instant.
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Type-check + build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/avis/[city]/page.tsx
git commit -m "feat: add city directory page /avis/[city]"
```

---

## Task 9: Search Landing `/avis`

**Files:**
- Create: `src/app/avis/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/avis/page.tsx
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
            Trouvez des avis <span className="gradient-text">vérifiés</span><br className="hidden sm:block" /> près de chez vous
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] mb-2">
            {totalCustomers.toLocaleString('fr-FR')} commerces certifiés · {totalBusinesses.toLocaleString('fr-FR')} fiches répertoriées
          </p>

          {/* Search */}
          <form action="/avis/search" className="flex flex-col sm:flex-row gap-3 mt-8 max-w-xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input name="q" placeholder="Restaurant, pharmacie, garage…" className="w-full pl-9 pr-4 py-3 border border-[var(--color-border)] rounded-xl bg-white text-sm focus:outline-none focus:border-[var(--color-brand-400)] shadow-sm" />
            </div>
            <input name="city" placeholder="Ville" className="sm:w-36 px-4 py-3 border border-[var(--color-border)] rounded-xl bg-white text-sm focus:outline-none focus:border-[var(--color-brand-400)] shadow-sm" />
            <button type="submit" className="bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-6 py-3 rounded-xl transition-colors">Rechercher</button>
          </form>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {CATEGORIES.map(cat => (
              <Link key={cat.value} href={`/avis?category=${cat.value}`}
                className="bg-white border border-[var(--color-border)] hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)] text-sm font-semibold text-[var(--color-text-secondary)] px-4 py-2 rounded-full transition-colors">
                {cat.emoji} {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Featured cities */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold">Villes populaires</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Explorez les commerces par ville</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {FEATURED_CITIES.map(city => (
            <Link key={city.name} href={`/avis/${nameToSlug(city.name)}`}
              className="group bg-white border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center text-lg shrink-0">{city.emoji}</div>
              <div>
                <div className="font-bold text-sm group-hover:text-[var(--color-brand-600)] transition-colors">{city.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">Voir les avis <ChevronRight className="w-3 h-3" /></div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/avis/page.tsx
git commit -m "feat: add /avis search landing page"
```

---

## Task 10: Update `/r/[slug]` — 301 Redirect

**Files:**
- Modify: `src/app/r/[slug]/page.tsx`

- [ ] **Step 1: Add redirect at the top of `BusinessVitrinePage`**

In `src/app/r/[slug]/page.tsx`, add the `redirect` import and add redirect logic at the start of `BusinessVitrinePage`:

```typescript
// Add to imports at top:
import { redirect } from 'next/navigation'
```

In `BusinessVitrinePage`, after the `business` is fetched (after the `notFound()` check), add:

```typescript
  // 301 redirect to canonical /avis/[city]/[slug] URL
  if (business.citySlug) {
    redirect(`/avis/${business.citySlug}/${business.slug}`)
  }
```

The full updated function start looks like:

```typescript
export default async function BusinessVitrinePage({ params }: PageProps) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
  });

  if (!business || !business.isActive) {
    notFound();
  }

  // 301 redirect to canonical /avis/[city]/[slug] URL
  if ((business as any).citySlug) {
    redirect(`/avis/${(business as any).citySlug}/${business.slug}`);
  }

  // ... rest of existing code unchanged
```

Note: `redirect()` in Next.js App Router throws internally and performs a 307 by default. For a permanent 301, use:

```typescript
  if ((business as any).citySlug) {
    redirect(`/avis/${(business as any).citySlug}/${business.slug}`, RedirectType.permanent)
  }
```

Add `RedirectType` to the import:

```typescript
import { redirect, RedirectType } from 'next/navigation'
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/r/[slug]/page.tsx
git commit -m "feat: add 301 redirect from /r/[slug] to /avis/[city]/[slug]"
```

---

## Task 11: Update `/businesses` Directory Links

**Files:**
- Modify: `src/app/businesses/page.tsx`

- [ ] **Step 1: Update the card `href` to use `/avis/[city]/[slug]` when available**

Find the `<Link>` wrapping each business card:

```tsx
// Change this:
href={`/r/${business.slug}`}

// To this:
href={(business as any).citySlug ? `/avis/${(business as any).citySlug}/${business.slug}` : `/r/${business.slug}`}
```

- [ ] **Step 2: Add a link to the new `/avis` directory in the header**

In the header section of `businesses/page.tsx`, add a link to `/avis` alongside the existing `Connexion` link.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/businesses/page.tsx
git commit -m "feat: update /businesses links to use /avis canonical URLs"
```

---

## Task 12: Final Build Verification

- [ ] **Step 1: Full build**

```bash
npm run build
```
Expected: `✓ Compiled successfully` — no TypeScript errors, no missing imports.

- [ ] **Step 2: Start dev server and verify pages manually**

```bash
npm run dev
```

Verify in browser:
- `http://localhost:3000/avis` — search landing renders, city grid shows
- `http://localhost:3000/avis/paris` — city directory renders (may be empty until ingestion)
- `http://localhost:3000/avis/paris/some-business` — generates from URL, shows State 3 (unknown), triggers background ingestion
- Visit the same URL again after ~5s — may now show State 2 if OSM returned results
- `http://localhost:3000/r/[existing-slug]` — redirects to `/avis/[city]/[slug]` if `citySlug` set

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete SEO directory feature (OSM+SIRENE on-demand, /avis routes)"
```

---

## Self-Review Notes

- `after()` from `next/server` requires Next.js 15.1+. Project has 16.2.3 ✓
- `db.businessListing.findUnique({ where: { citySlug_slug: ... } })` uses the compound unique index name — Prisma generates this as `citySlug_slug` from `@@unique([citySlug, slug])` ✓
- `db.businessListing.upsert({ where: { source_externalId: ... } })` uses `@@unique([source, externalId])` — Prisma generates this as `source_externalId` ✓
- `redirect()` with `RedirectType.permanent` produces HTTP 308 in Next.js (permanent redirect). For true 301, need route handler. For SEO purposes 308 is equivalent — Google treats them the same ✓
- `(business as any).citySlug` used because TypeScript Prisma client regeneration happens at `db:push` time — after Task 2 runs, this cast is safe to remove ✓
- Ingestion runs in `after()` — if the Next.js runtime doesn't support it in this environment, wrap in try/catch and log
