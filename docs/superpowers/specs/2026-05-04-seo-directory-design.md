# SEO Directory Feature — Design Spec
**Date:** 2026-05-04  
**Status:** Approved

---

## Goal

Build a Trustpilot-style directory where Grade ranks on Google for any business search (e.g. "Garage MOMO Bagnolet avis") — even if that business is not a Grade customer. Pages are generated on-demand when first visited. Grade customers get their full verified review page; non-customers get a rich SEO placeholder with CTA to sign up.

---

## Architecture: Option C — Unified Route + 301 Redirect

Single canonical URL pattern: `/avis/[citySlug]/[slug]`

- **Grade customers** → full page with verified reviews (same content as current `/r/[slug]`)
- **Listed non-customers** (from OSM/SIRENE) → placeholder with business info + sign-up CTA
- **Unknown** (not in DB) → URL-generated placeholder + sign-up CTA
- **`/r/[slug]`** → 301 redirect to `/avis/[citySlug]/[slug]` (backwards compat for QR codes)

---

## Routes

| Route | Purpose |
|---|---|
| `/avis` | Search & explore landing — city grid + category pills |
| `/avis/[city]` | City directory — certified first, OSM/SIRENE below divider |
| `/avis/[city]/[slug]` | Business page — 3 states (customer / listed / unknown) |
| `/r/[slug]` | 301 → `/avis/[citySlug]/[slug]` |

---

## Data Layer

### New model: `BusinessListing`

Stores non-customer businesses from OSM/SIRENE. Never 404s — if no listing exists, page generates from URL params.

```prisma
model BusinessListing {
  id         String        @id @default(cuid())
  name       String
  slug       String        // nameToSlug(name) + street suffix if conflict
  city       String        // display name e.g. "Paris"
  citySlug   String        // url-safe e.g. "paris"
  address    String?
  phone      String?
  website    String?
  category   String?       // "garage", "boulangerie", etc.
  source     ListingSource
  externalId String        // OSM node ID or SIREN number
  lat        Float?
  lng        Float?
  country    String        @default("FR")
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  @@unique([source, externalId])   // dedup on re-ingestion
  @@unique([citySlug, slug])       // URL routing
  @@index([citySlug])
  @@map("business_listings")
}

enum ListingSource {
  OSM
  SIRENE
  MANUAL
}
```

### `Business` model changes

Add city fields so customers can be found by city URL:

```prisma
city     String?   // display city name
citySlug String?   // url-safe slug
```

---

## On-Demand Ingestion

Page visit to `/avis/[city]/[slug]` triggers background population if city has < 10 listings. Flow:

1. Page renders immediately with URL-generated data (State 3)
2. `after()` (Next.js 15+ post-response hook) triggers ingestion in background
3. OSM Overpass API queried for city + inferred category
4. France cities also query SIRENE (`recherche-entreprises.api.gouv.fr` — no API key)
5. Results upserted into `BusinessListing` via `@@unique([source, externalId])`
6. Next visit to same city shows enriched data

Country detection: if `citySlug` matches known French city → also query SIRENE. Otherwise OSM only.

---

## SEO Strategy

Every `/avis/[city]/[slug]` page includes:

- **Title:** `Avis [Business Name] à [City] — Grade`
- **Description:** `Consultez les avis authentiques pour [Business Name] à [City]. Avis certifiés par Grade.`
- **JSON-LD:** `LocalBusiness` schema with name, address, geo coords, aggregateRating (if customer)
- **H1:** `Avis [Business Name] à [City]`
- **Nearby section:** Other businesses same city+category (prevents thin content)
- **Mobile-first:** Single column on mobile, 2-col sidebar on desktop

---

## Page States

### State 1 — Grade Customer
- Full profile card (name, address, score, review count)
- Verified reviews grid
- "Laisser un avis" CTA → `/r/[slug]/review` (existing token-verified flow)
- `✅ Certifié Grade` badge

### State 2 — Listed (OSM/SIRENE data)
- Profile card with OSM/SIRENE data (greyed avatar, no certified badge)
- Source badge ("Source: OpenStreetMap")
- Warning: "Ce commerce n'utilise pas encore Grade"
- CTA: "Vous êtes le propriétaire ? Activer Grade →" → `/onboarding`
- Nearby businesses section

### State 3 — Unknown (URL-generated)
- Display name from `slugToName(slug)` + city from `citySlugToName(city)`
- "Fiche non revendiquée" badge
- Same CTA as State 2

---

## Utilities

### `src/lib/slug-utils.ts`
- `nameToSlug(name)` — normalize accents, lowercase, hyphenate
- `slugToName(slug)` — capitalize each word
- `citySlugToName(slug)` — same as slugToName
- `generateBusinessSlug(name, address?)` — name slug + street suffix if address provided

### `src/lib/osm.ts`
- `fetchOSMBusinesses(cityName, category, limit?)` → `OSMBusiness[]`
- Uses Overpass API (`overpass-api.de/api/interpreter`)
- Category mapped to OSM tags (`garage` → `shop=car_repair`, etc.)
- Cached 1h via Next.js `fetch` cache

### `src/lib/sirene.ts`
- `fetchSIRENEBusinesses(query, commune?)` → `SIRENEBusiness[]`
- Uses `recherche-entreprises.api.gouv.fr` (no API key, public)
- France only
- Cached 1h

---

## Files to Create

```
src/lib/slug-utils.ts
src/lib/osm.ts
src/lib/sirene.ts
src/app/avis/page.tsx
src/app/avis/[city]/page.tsx
src/app/avis/[city]/[slug]/page.tsx
src/app/api/public/search/route.ts
```

## Files to Modify

```
prisma/schema.prisma          — add BusinessListing model + city fields to Business
src/app/r/[slug]/page.tsx     — add 301 redirect to /avis/[citySlug]/[slug]
src/app/businesses/page.tsx   — link cards to /avis/[city]/[slug]
```

---

## Responsive Design

All pages: mobile-first single column, desktop 2-col (main + sidebar).  
Hero card: avatar centered, text stacked below on mobile. Side-by-side on desktop.  
City directory: 1 col mobile, 2 col tablet, 3 col desktop.

---

## Out of Scope

- Admin ingestion UI panel (on-demand covers this)
- Google Places API (add later if OSM data insufficient)
- Review collection for non-customers (token required by design)
- Claiming/linking flow (customers register directly via onboarding)
