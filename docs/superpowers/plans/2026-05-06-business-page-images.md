# Business Page Images + Layout C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/avis/[city]/[slug]` to Layout C and add logo + photo upload for businesses, with management in dashboard settings and admin panel.

**Architecture:** UploadThing v7 handles file storage. New `BusinessPhoto` Prisma model stores ordered photo URLs. The public business page is a server component that fetches photos/logo along with reviews; a `ReviewsClient` child handles client-side star filtering. Dashboard settings adds logo + photo gallery management. Admin gets logo avatar in list and phone/website in edit modal.

**Tech Stack:** Next.js 16 App Router, Prisma/PostgreSQL, UploadThing v7 (`uploadthing`, `@uploadthing/react`), Tailwind v4 CSS tokens

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `BusinessPhoto` model + relation on Business |
| `next.config.ts` | Modify | Add `utfs.io` to `images.remotePatterns` |
| `src/lib/uploadthing.ts` | Create | UploadThing server router (businessLogo + businessPhotos endpoints) |
| `src/app/api/uploadthing/route.ts` | Create | Next.js GET+POST handler for UploadThing |
| `src/app/api/business/photos/route.ts` | Create | DELETE a BusinessPhoto (ownership check) |
| `src/app/api/business/photos/reorder/route.ts` | Create | PATCH reorder photos (ownership check) |
| `src/app/api/business/route.ts` | Modify | Add `logoUrl` + `photos` to GET select; add `logoUrl` to PATCH |
| `src/app/avis/[city]/[slug]/page.tsx` | Rewrite | Layout C: hero photos, action row, info cards, criteria bars, CTA banner |
| `src/app/avis/[city]/[slug]/loading.tsx` | Modify | Skeleton matching Layout C |
| `src/components/public/reviews-client.tsx` | Create | Client component: star filter chips + filtered 2-col review grid |
| `src/app/dashboard/settings/page.tsx` | Modify | Add logo section + photo gallery section |
| `src/app/admin/businesses/page.tsx` | Modify | Logo avatar in list, phone/website in edit modal |

---

### Task 1: Add BusinessPhoto DB model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model to schema**

In `prisma/schema.prisma`, add after the `Business` model closing brace (after the `@@map("businesses")` line), and add `photos` relation inside `Business`:

Inside Business model, after `responses   ReviewResponse[]`, add:
```prisma
  photos         BusinessPhoto[]
```

After the `Business` model's closing `}`, add:
```prisma
model BusinessPhoto {
  id         String   @id @default(cuid())
  businessId String
  url        String
  order      Int      @default(0)
  createdAt  DateTime @default(now())
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@index([businessId])
  @@map("business_photos")
}
```

- [ ] **Step 2: Push schema to DB**

```bash
npx prisma db push
```

Expected output: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors related to BusinessPhoto.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add BusinessPhoto model with cascade delete"
```

---

### Task 2: UploadThing setup

**Files:**
- Create: `src/lib/uploadthing.ts`
- Create: `src/app/api/uploadthing/route.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install uploadthing @uploadthing/react
```

- [ ] **Step 2: Create uploadthing server router**

Create `src/lib/uploadthing.ts`:
```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

const f = createUploadthing();

export const uploadRouter = {
  businessLogo: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const session = await requireSession();
      const businessId = req.headers.get("x-business-id");
      if (!businessId) throw new Error("businessId requis");

      if (session.role !== "ADMIN") {
        const membership = await db.staffMembership.findUnique({
          where: { userId_businessId: { userId: session.userId, businessId } },
        });
        if (!membership) throw new Error("Accès refusé");
      }

      return { businessId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.business.update({
        where: { id: metadata.businessId },
        data: { logoUrl: file.ufsUrl },
      });
      return { url: file.ufsUrl };
    }),

  businessPhotos: f({ image: { maxFileSize: "4MB", maxFileCount: 6 } })
    .middleware(async ({ req }) => {
      const session = await requireSession();
      const businessId = req.headers.get("x-business-id");
      if (!businessId) throw new Error("businessId requis");

      if (session.role !== "ADMIN") {
        const membership = await db.staffMembership.findUnique({
          where: { userId_businessId: { userId: session.userId, businessId } },
        });
        if (!membership) throw new Error("Accès refusé");
      }

      const count = await db.businessPhoto.count({ where: { businessId } });
      if (count >= 6) throw new Error("Maximum 6 photos");

      return { businessId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const last = await db.businessPhoto.findFirst({
        where: { businessId: metadata.businessId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      await db.businessPhoto.create({
        data: {
          businessId: metadata.businessId,
          url: file.ufsUrl,
          order: (last?.order ?? -1) + 1,
        },
      });
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
```

- [ ] **Step 3: Create API route handler**

Create `src/app/api/uploadthing/route.ts`:
```typescript
import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandler({ router: uploadRouter });
```

- [ ] **Step 4: Add utfs.io to next.config.ts image domains**

Edit `next.config.ts` — add `images` config inside `nextConfig`:
```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};
```

- [ ] **Step 5: Add env vars (manual step)**

Add to `.env.local` (do not commit):
```
UPLOADTHING_SECRET=your_secret_here
UPLOADTHING_APP_ID=your_app_id_here
```

Get values from https://uploadthing.com dashboard.

- [ ] **Step 6: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/uploadthing.ts src/app/api/uploadthing/route.ts next.config.ts
git commit -m "feat: add UploadThing router for logo and photos"
```

---

### Task 3: Photo API routes (delete + reorder)

**Files:**
- Create: `src/app/api/business/photos/route.ts`
- Create: `src/app/api/business/photos/reorder/route.ts`

- [ ] **Step 1: Create photo DELETE route**

Create `src/app/api/business/photos/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("id");

    if (!photoId) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    const photo = await db.businessPhoto.findUnique({
      where: { id: photoId },
      select: { businessId: true },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
    }

    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_businessId: { userId: session.userId, businessId: photo.businessId } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    await db.businessPhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create photo reorder route**

Create `src/app/api/business/photos/reorder/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { businessId, photoIds } = body as { businessId: string; photoIds: string[] };

    if (!businessId || !Array.isArray(photoIds)) {
      return NextResponse.json({ error: "businessId et photoIds requis" }, { status: 400 });
    }

    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_businessId: { userId: session.userId, businessId } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    await Promise.all(
      photoIds.map((id, index) =>
        db.businessPhoto.update({ where: { id }, data: { order: index } })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/business/photos/route.ts src/app/api/business/photos/reorder/route.ts
git commit -m "feat: add photo delete and reorder API routes"
```

---

### Task 4: Update /api/business GET and PATCH

**Files:**
- Modify: `src/app/api/business/route.ts`

- [ ] **Step 1: Add logoUrl to GET select and PATCH handler**

Replace the full `src/app/api/business/route.ts` content with:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { extractCityFromAddress } from "@/lib/slug-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_businessId: { userId: session.userId, businessId: id } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const business = await db.business.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        description: true,
        phone: true,
        website: true,
        logoUrl: true,
        isActive: true,
        photos: {
          orderBy: { order: "asc" },
          select: { id: true, url: true, order: true },
        },
      },
    });

    return NextResponse.json({ business });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { id, name, address, description, phone, website, logoUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_businessId: { userId: session.userId, businessId: id } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const cityInfo = address ? extractCityFromAddress(address) : null;

    const business = await db.business.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(cityInfo ? { city: cityInfo.city, citySlug: cityInfo.citySlug } : {}),
      },
    });

    return NextResponse.json({ business });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/business/route.ts
git commit -m "feat: expose logoUrl and photos in business API"
```

---

### Task 5: Rewrite business public page (Layout C)

**Files:**
- Rewrite: `src/app/avis/[city]/[slug]/page.tsx`
- Create: `src/components/public/reviews-client.tsx`

- [ ] **Step 1: Create ReviewsClient component**

Create `src/components/public/reviews-client.tsx`:
```typescript
"use client";

import { useState } from "react";
import { Star, CheckCircle2, Quote } from "lucide-react";

interface CriterionScore {
  id: string;
  criterionName: string;
  score: number;
}

interface ReviewResponse {
  content: string;
}

interface Review {
  id: string;
  overallScore: number;
  comment: string | null;
  createdAt: string;
  criterionScores: CriterionScore[];
  response: ReviewResponse | null;
}

interface Props {
  reviews: Review[];
  businessName: string;
}

export default function ReviewsClient({ reviews, businessName }: Props) {
  const [filter, setFilter] = useState<number | null>(null);

  const starCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.overallScore) === star).length,
  }));

  const filtered = filter === null
    ? reviews
    : reviews.filter(r => Math.round(r.overallScore) === filter);

  return (
    <div className="space-y-5">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            filter === null
              ? "bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]"
              : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-300)]"
          }`}
        >
          Tous ({reviews.length})
        </button>
        {starCounts.filter(s => s.count > 0).map(({ star, count }) => (
          <button
            key={star}
            onClick={() => setFilter(filter === star ? null : star)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filter === star
                ? "bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]"
                : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-300)]"
            }`}
          >
            {star}★ ({count})
          </button>
        ))}
      </div>

      {/* Review grid */}
      {filtered.length === 0 ? (
        <div className="p-10 rounded-[2rem] bg-white border border-[var(--color-border)] text-center">
          <div className="w-14 h-14 bg-[var(--color-bg-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
            <Quote className="w-5 h-5 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-bold mb-1">Aucun avis pour ce filtre</h3>
          <p className="text-[var(--color-text-secondary)] text-sm">Essayez un autre filtre ou supprimez-le.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filtered.map(rev => (
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
                    {new Date(rev.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              {rev.comment && (
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic border-l-4 border-[var(--color-brand-100)] pl-3 mb-4">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              )}
              {rev.criterionScores.length > 0 && (
                <div className="pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-x-4 gap-y-2">
                  {rev.criterionScores.map(c => (
                    <div key={c.id} className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-[var(--color-text-muted)]">{c.criterionName}</span>
                      <span className="text-sm font-bold">{c.score}/5</span>
                    </div>
                  ))}
                </div>
              )}
              {rev.response && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] -mx-6 -mb-6 px-6 pb-6 rounded-b-[2rem]">
                  <p className="text-xs font-bold text-[var(--color-brand-600)] mb-1">Réponse du propriétaire</p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{rev.response.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the business page**

Replace all of `src/app/avis/[city]/[slug]/page.tsx` with:
```typescript
import { db } from "@/lib/db";
import { after } from "next/server";
import Link from "next/link";
import Image from "next/image";
import {
  Star, MapPin, ArrowRight, CheckCircle2, ChevronRight,
  Phone, Globe, AlertCircle
} from "lucide-react";
import { slugToName, citySlugToName } from "@/lib/slug-utils";
import { shouldIngestCity, ingestCity } from "@/lib/ingest";
import PublicHeader from "@/components/public/public-header";
import ReviewsClient from "@/components/public/reviews-client";

interface Props {
  params: Promise<{ city: string; slug: string }>;
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
        where: { moderationStatus: "PUBLISHED", visibilityType: "PUBLIC" },
        include: { criterionScores: true, response: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      photos: { orderBy: { order: "asc" } },
    },
  });

  if (business) return { type: "customer" as const, business, listing: null };

  const listing = await db.businessListing.findUnique({
    where: { citySlug_slug: { citySlug: city, slug } },
  });

  if (listing) return { type: "listed" as const, business: null, listing };

  return { type: "unknown" as const, business: null, listing: null };
}

export async function generateMetadata({ params }: Props) {
  const { city, slug } = await params;
  const { type, business, listing } = await getPageData(city, slug);

  const name = business?.name ?? listing?.name ?? slugToName(slug);
  const cityDisplay = business?.city ?? listing?.city ?? citySlugToName(city);
  const address = business?.address ?? listing?.address;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    ...(address
      ? { address: { "@type": "PostalAddress", streetAddress: address, addressLocality: cityDisplay } }
      : {}),
    ...(listing?.lat
      ? { geo: { "@type": "GeoCoordinates", latitude: listing.lat, longitude: listing.lng } }
      : {}),
    ...(type === "customer" && business!.reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (
              business!.reviews.reduce((s, r) => s + r.overallScore, 0) / business!.reviews.length
            ).toFixed(1),
            reviewCount: business!.reviews.length,
          },
        }
      : {}),
  };

  const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const canonicalUrl = `${BASE}/avis/${city}/${slug}`;

  return {
    title: `Avis ${name} à ${cityDisplay} — Grade`,
    description: `Consultez les avis authentiques et vérifiés pour ${name} à ${cityDisplay}. Témoignages certifiés par de vrais clients.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `Avis ${name} à ${cityDisplay}`,
      description: `Avis vérifiés pour ${name} à ${cityDisplay}`,
      url: canonicalUrl,
      siteName: "Grade",
      locale: "fr_FR",
      type: "website",
    },
  };
}

export default async function AvisPage({ params }: Props) {
  const { city, slug } = await params;
  const { type, business, listing } = await getPageData(city, slug);

  const name = business?.name ?? listing?.name ?? slugToName(slug);
  const cityDisplay = business?.city ?? listing?.city ?? citySlugToName(city);
  const address = business?.address ?? listing?.address;
  const phone = business?.phone ?? listing?.phone ?? null;
  const website = business?.website ?? listing?.website ?? null;
  const description = business?.description ?? null;
  const photos = business?.photos ?? [];
  const logoUrl = business?.logoUrl ?? null;

  after(async () => {
    try {
      const needs = await shouldIngestCity(city);
      if (needs) await ingestCity(cityDisplay, city);
    } catch (err) {
      console.error("[avis] background ingestion failed:", err);
    }
  });

  const nearby = await db.businessListing.findMany({
    where: { citySlug: city, slug: { not: slug } },
    take: 4,
    orderBy: { createdAt: "desc" },
    select: { name: true, slug: true, citySlug: true, category: true },
  });

  const nearbyCustomers = await db.business.findMany({
    where: { citySlug: city, slug: { not: slug }, isActive: true },
    take: 4,
    select: {
      name: true,
      slug: true,
      citySlug: true,
      reviews: {
        where: { moderationStatus: "PUBLISHED", visibilityType: "PUBLIC" },
        select: { overallScore: true },
      },
    },
  });

  const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    url: `${BASE}/avis/${city}/${slug}`,
    ...(address
      ? { address: { "@type": "PostalAddress", streetAddress: address, addressLocality: cityDisplay, addressCountry: "FR" } }
      : {}),
    ...(listing?.lat
      ? { geo: { "@type": "GeoCoordinates", latitude: listing.lat, longitude: listing.lng } }
      : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(website ? { url: website } : {}),
    ...(type === "customer" && business!.reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (
              business!.reviews.reduce((s, r) => s + r.overallScore, 0) / business!.reviews.length
            ).toFixed(1),
            reviewCount: business!.reviews.length,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: BASE },
      { "@type": "ListItem", position: 2, name: "Avis", item: `${BASE}/avis` },
      { "@type": "ListItem", position: 3, name: cityDisplay, item: `${BASE}/avis/${city}` },
      { "@type": "ListItem", position: 4, name, item: `${BASE}/avis/${city}/${slug}` },
    ],
  };

  const avgScore =
    type === "customer" && business!.reviews.length > 0
      ? business!.reviews.reduce((s, r) => s + r.overallScore, 0) / business!.reviews.length
      : null;

  // Aggregate criterion scores for bar chart
  const criteriaMap = new Map<string, number[]>();
  if (type === "customer") {
    for (const rev of business!.reviews) {
      for (const c of rev.criterionScores) {
        const arr = criteriaMap.get(c.criterionName) ?? [];
        arr.push(c.score);
        criteriaMap.set(c.criterionName, arr);
      }
    }
  }
  const criteriaAverages = Array.from(criteriaMap.entries()).map(([name, scores]) => ({
    name,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  // Serialize reviews for client component (dates must be strings)
  const serializedReviews =
    type === "customer"
      ? business!.reviews.map(r => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))
      : [];

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

        <div className="max-w-4xl mx-auto px-4 lg:px-0 pt-0">

          {/* ── Hero photo zone ── */}
          <div className="relative h-60 overflow-hidden bg-gradient-to-br from-[var(--color-brand-600)] to-[var(--color-brand-400)]">
            {photos.length > 0 ? (
              <div className={`grid h-full ${photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-0.5`}>
                {photos.slice(0, 3).map(p => (
                  <div key={p.id} className="relative overflow-hidden">
                    <Image src={p.url} alt={name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                  </div>
                ))}
              </div>
            ) : null}
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {/* Business name + score pill overlaid */}
            <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-md shrink-0">
                    <Image src={logoUrl} alt={`Logo ${name}`} width={56} height={56} className="object-cover w-full h-full" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/20 border-2 border-white/40 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-black text-white">{name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight drop-shadow">{name}</h1>
                  <p className="text-white/70 text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {cityDisplay}
                  </p>
                </div>
              </div>
              {avgScore !== null && (
                <div className="shrink-0 flex items-center gap-1.5 bg-yellow-400/90 text-yellow-900 px-3 py-1.5 rounded-xl font-black text-lg shadow-md backdrop-blur-sm">
                  <Star className="w-4 h-4 fill-current" />
                  {avgScore.toFixed(1)}
                </div>
              )}
            </div>
          </div>

          {/* ── Action row ── */}
          <div className="bg-white border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3 flex-wrap">
            {type === "customer" && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Certifié Grade</span>
              </div>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[var(--color-border)] text-sm font-semibold hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)] transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Appeler
              </a>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[var(--color-border)] text-sm font-semibold hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)] transition-colors"
              >
                <Globe className="w-3.5 h-3.5" /> Site web
              </a>
            )}
          </div>

          <div className="pt-6 space-y-6">

            {/* ── Info cards (contact + about) ── */}
            {(address || phone || website || description) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(address || phone || website) && (
                  <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Contact</h3>
                    {address && (
                      <p className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                        <MapPin className="w-4 h-4 text-[var(--color-brand-500)] shrink-0 mt-0.5" />
                        {address}
                      </p>
                    )}
                    {phone && (
                      <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-[var(--color-brand-600)] font-medium hover:underline">
                        <Phone className="w-4 h-4 shrink-0" />
                        {phone}
                      </a>
                    )}
                    {website && (
                      <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--color-brand-600)] font-medium hover:underline truncate">
                        <Globe className="w-4 h-4 shrink-0" />
                        {website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                )}
                {description && (
                  <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">À propos</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Criteria bar chart (customer only) ── */}
            {criteriaAverages.length > 0 && (
              <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-5">Critères</h3>
                <div className="flex items-end justify-around gap-2 h-28">
                  {criteriaAverages.map(c => (
                    <div key={c.name} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs font-black text-[var(--color-brand-600)]">{c.avg.toFixed(1)}</span>
                      <div className="w-full bg-[var(--color-bg-muted)] rounded-t-md overflow-hidden" style={{ height: "80px" }}>
                        <div
                          className="w-full bg-[var(--color-brand-500)] rounded-t-md transition-all"
                          style={{ height: `${(c.avg / 5) * 100}%`, marginTop: `${(1 - c.avg / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--color-text-muted)] text-center leading-tight max-w-[60px] truncate">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* State-specific content */}
            {type === "customer" ? (
              <>
                {/* ── CTA banner ── */}
                <Link
                  href={`/r/${business!.slug}/review`}
                  className="group flex flex-col sm:flex-row items-center justify-between p-5 rounded-[1.5rem] bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-500)] hover:from-[var(--color-brand-700)] hover:to-[var(--color-brand-600)] shadow-lg gap-4 transition-all hover:scale-[1.01]"
                >
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

                {/* ── Reviews section ── */}
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-extrabold">Expériences certifiées</h2>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                      {business!.reviews.length} avis · Tous les témoignages proviennent de clients vérifiés.
                    </p>
                  </div>
                  <ReviewsClient reviews={serializedReviews} businessName={name} />
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

                <div className="p-6 rounded-[1.5rem] bg-gradient-to-br from-[var(--color-brand-50)] to-white border border-[var(--color-brand-200)] text-center">
                  <div className="text-3xl mb-3">🚀</div>
                  <h3 className="text-base font-bold text-[var(--color-brand-700)] mb-2">
                    Vous êtes le propriétaire de {name} ?
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4 max-w-sm mx-auto">
                    Activez Grade pour collecter des avis certifiés, booster votre visibilité Google et gérer votre réputation.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white font-bold px-6 py-3 rounded-xl transition-colors"
                  >
                    Activer Grade gratuitement <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}

            {/* ── Nearby section ── */}
            {(nearby.length > 0 || nearbyCustomers.length > 0) && (
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold">Autres commerces à {cityDisplay}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nearbyCustomers.map(b => {
                    const avg =
                      b.reviews.length > 0
                        ? (b.reviews.reduce((s, r) => s + r.overallScore, 0) / b.reviews.length).toFixed(1)
                        : null;
                    return (
                      <Link
                        key={b.slug}
                        href={b.citySlug ? `/avis/${b.citySlug}/${b.slug}` : `/r/${b.slug}`}
                        className="group p-4 bg-white border border-[var(--color-border)] rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center font-black text-[var(--color-brand-600)]">
                            {b.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{b.name}</div>
                            {avg && (
                              <div className="text-xs text-yellow-600 font-semibold">
                                ⭐ {avg} · {b.reviews.length} avis
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Certifié
                        </div>
                      </Link>
                    );
                  })}
                  {nearby.map(l => (
                    <Link
                      key={l.slug}
                      href={`/avis/${l.citySlug}/${l.slug}`}
                      className="group p-4 bg-white border border-[var(--color-border)] rounded-2xl flex items-center justify-between hover:shadow-md transition-shadow"
                    >
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
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Update loading skeleton to match Layout C**

Replace all of `src/app/avis/[city]/[slug]/loading.tsx`:
```typescript
export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] animate-pulse">
      <div className="h-16 bg-[var(--color-bg)] border-b border-[var(--color-border)]" />
      {/* Hero skeleton */}
      <div className="h-60 bg-[var(--color-bg-muted)]" />
      {/* Action row skeleton */}
      <div className="h-12 bg-[var(--color-bg)] border-b border-[var(--color-border)]" />
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 bg-[var(--color-bg-muted)] rounded-2xl" />
          <div className="h-32 bg-[var(--color-bg-muted)] rounded-2xl" />
        </div>
        {/* Criteria bars */}
        <div className="h-40 bg-[var(--color-bg-muted)] rounded-2xl" />
        {/* CTA */}
        <div className="h-20 bg-[var(--color-bg-muted)] rounded-2xl" />
        {/* Reviews */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-[var(--color-bg-muted)] rounded-[2rem]" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/avis/[city]/[slug]/page.tsx src/app/avis/[city]/[slug]/loading.tsx src/components/public/reviews-client.tsx
git commit -m "feat: business page Layout C with hero, criteria bars, ReviewsClient filter chips"
```

---

### Task 6: Dashboard settings — logo + photo management

**Files:**
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Replace settings page with logo + photo sections added**

Replace all of `src/app/dashboard/settings/page.tsx`:
```typescript
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Card, Button, Input, Textarea, Skeleton } from "@/components/ui";
import { useBusinessId } from "@/components/dashboard/shell";
import { Building2, User, Save, CheckCircle2, X, ChevronUp, ChevronDown, ImagePlus } from "lucide-react";
import { useUploadThing } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

interface Photo {
  id: string;
  url: string;
  order: number;
}

interface BusinessData {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  photos: Photo[];
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
}

export default function SettingsPage() {
  const businessId = useBusinessId();

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessSaved, setBusinessSaved] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [photosUploading, setPhotosUploading] = useState(false);

  const [user, setUser] = useState<UserData | null>(null);
  const [userName, setUserName] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [userSaved, setUserSaved] = useState(false);

  const [loading, setLoading] = useState(true);

  const { startUpload: uploadLogo } = useUploadThing<OurFileRouter>("businessLogo", {
    headers: { "x-business-id": businessId ?? "" },
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) {
        setLogoUrl(res[0].url);
        fetch("/api/business", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: businessId, logoUrl: res[0].url }),
        });
      }
      setLogoUploading(false);
    },
    onUploadError: () => setLogoUploading(false),
  });

  const { startUpload: uploadPhotos } = useUploadThing<OurFileRouter>("businessPhotos", {
    headers: { "x-business-id": businessId ?? "" },
    onClientUploadComplete: async () => {
      // Refetch photos after upload
      if (businessId) {
        const res = await fetch(`/api/business?id=${businessId}`);
        const data = await res.json();
        if (data.business?.photos) setPhotos(data.business.photos);
      }
      setPhotosUploading(false);
    },
    onUploadError: () => setPhotosUploading(false),
  });

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    try {
      const [restRes, userRes] = await Promise.all([
        fetch(`/api/business?id=${businessId}`),
        fetch(`/api/profile`),
      ]);
      const restData = await restRes.json();
      const userData = await userRes.json();

      if (restData.business) {
        const r = restData.business;
        setBusiness(r);
        setBusinessName(r.name || "");
        setBusinessAddress(r.address || "");
        setBusinessDescription(r.description || "");
        setBusinessPhone(r.phone || "");
        setBusinessWebsite(r.website || "");
        setLogoUrl(r.logoUrl || null);
        setPhotos(r.photos || []);
      }
      if (userData.user) {
        setUser(userData.user);
        setUserName(userData.user.name || "");
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessSaving(true);
    setBusinessSaved(false);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: businessId,
          name: businessName,
          address: businessAddress,
          description: businessDescription,
          phone: businessPhone,
          website: businessWebsite,
        }),
      });
      if (res.ok) {
        setBusinessSaved(true);
        setTimeout(() => setBusinessSaved(false), 3000);
      }
    } finally {
      setBusinessSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaving(true);
    setUserSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName }),
      });
      if (res.ok) {
        setUserSaved(true);
        setTimeout(() => setUserSaved(false), 3000);
      }
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    await fetch(`/api/business/photos?id=${photoId}`, { method: "DELETE" });
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const movePhoto = async (index: number, direction: "up" | "down") => {
    const newPhotos = [...photos];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newPhotos.length) return;
    [newPhotos[index], newPhotos[swapIndex]] = [newPhotos[swapIndex], newPhotos[index]];
    setPhotos(newPhotos);
    await fetch("/api/business/photos/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, photoIds: newPhotos.map(p => p.id) }),
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Gérez les informations de votre profil et de votre établissement
        </p>
      </div>

      {/* Logo section */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Logo</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Image ronde affichée sur la page publique (max 2 Mo)</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            {logoUrl ? (
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[var(--color-border)] shadow">
                <Image src={logoUrl} alt="Logo" width={80} height={80} className="object-cover w-full h-full" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-[var(--color-bg-muted)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center">
                <span className="text-3xl font-black text-[var(--color-text-muted)]">
                  {businessName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={logoUploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setLogoUploading(true);
                    await uploadLogo([file]);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" isLoading={logoUploading} asChild={false}>
                  {logoUploading ? "Upload en cours..." : logoUrl ? "Changer le logo" : "Téléverser un logo"}
                </Button>
              </label>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">JPG, PNG ou WebP · Max 2 Mo</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Photos section */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Photos ({photos.length}/6)</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Affichées en hero sur la page publique · Max 4 Mo chacune</p>
            </div>
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-[var(--color-border)] aspect-video bg-[var(--color-bg-muted)]">
                  <Image src={photo.url} alt={`Photo ${index + 1}`} fill className="object-cover" sizes="200px" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      onClick={() => movePhoto(index, "up")}
                      disabled={index === 0}
                      className="p-1 rounded bg-white/80 disabled:opacity-30 hover:bg-white transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-gray-800" />
                    </button>
                    <button
                      onClick={() => movePhoto(index, "down")}
                      disabled={index === photos.length - 1}
                      className="p-1 rounded bg-white/80 disabled:opacity-30 hover:bg-white transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-gray-800" />
                    </button>
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="p-1 rounded bg-white/80 hover:bg-red-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {photos.length < 6 && (
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={photosUploading}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []).slice(0, 6 - photos.length);
                  if (!files.length) return;
                  setPhotosUploading(true);
                  await uploadPhotos(files);
                  e.target.value = "";
                }}
              />
              <Button type="button" variant="outline" isLoading={photosUploading} asChild={false}>
                {photosUploading ? "Upload en cours..." : "Ajouter des photos"}
              </Button>
            </label>
          )}
        </div>
      </Card>

      {/* Profile section */}
      <Card>
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mon Profil</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Vos informations personnelles</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom complet"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Votre nom"
            />
            <Input label="Email" value={user?.email || ""} disabled className="opacity-60" />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={userSaving}>
              <Save className="w-4 h-4" />
              Enregistrer le profil
            </Button>
            {userSaved && (
              <span className="text-sm text-emerald-600 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Sauvegardé
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Business section */}
      <Card>
        <form onSubmit={handleSaveBusiness} className="space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mon Établissement</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Informations visibles publiquement</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom de l'établissement"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
            <Input
              label="Téléphone"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>
          <Input
            label="Adresse complète"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder="10 Rue de la Paix, 75002 Paris"
            required
          />
          <Input
            label="Site web"
            value={businessWebsite}
            onChange={(e) => setBusinessWebsite(e.target.value)}
            placeholder="https://www.mon-business.fr"
          />
          <Textarea
            label="Description"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            rows={4}
            placeholder="Décrivez votre établissement, vos spécialités, votre ambiance..."
          />
          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={businessSaving}>
              <Save className="w-4 h-4" />
              Enregistrer l&apos;établissement
            </Button>
            {businessSaved && (
              <span className="text-sm text-emerald-600 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Sauvegardé
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/settings/page.tsx
git commit -m "feat: add logo + photo management to dashboard settings"
```

---

### Task 7: Admin businesses — logo avatar + phone/website in edit modal

**Files:**
- Modify: `src/app/admin/businesses/page.tsx`

- [ ] **Step 1: Update Business interface and add logo/phone/website to state and handlers**

In `src/app/admin/businesses/page.tsx`, make the following changes:

1. Add `Image` import from `"next/image"`.
2. Update `Business` interface — add `logoUrl: string | null; phone: string | null; website: string | null;`.
3. Add `editPhone` and `editWebsite` state variables (useState "").
4. In `openEdit` function, add `setEditPhone(business.phone || ""); setEditWebsite(business.website || "");`.
5. In `handleUpdate` body JSON, add `phone: editPhone, website: editWebsite`.
6. In the business list item, add logo avatar next to the name.
7. In the edit modal form, add phone + website inputs.

Full replacement of `src/app/admin/businesses/page.tsx`:
```typescript
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, Badge, Skeleton, EmptyState, Button, Input, Textarea } from "@/components/ui";
import { Store, Edit2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Business {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { reviews: number; visitTokens: number };
  memberships: { user: { email: string; name: string | null } }[];
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/businesses")
      .then((response) => response.json())
      .then((data) => {
        setBusinesses(data.businesses || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, address: newAddress, description: newDescription }),
      });
      const data = await response.json();

      if (data.business) {
        setBusinesses([
          { ...data.business, _count: { reviews: 0, visitTokens: 0 }, memberships: [] },
          ...businesses,
        ]);
        setNewName("");
        setNewAddress("");
        setNewDescription("");
        setShowCreateForm(false);
      } else {
        alert(data.error);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (business: Business) => {
    setEditingBusiness(business);
    setEditName(business.name);
    setEditAddress(business.address || "");
    setEditDescription(business.description || "");
    setEditPhone(business.phone || "");
    setEditWebsite(business.website || "");
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingBusiness) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBusiness.id,
          name: editName,
          address: editAddress,
          description: editDescription,
          phone: editPhone,
          website: editWebsite,
        }),
      });
      const data = await response.json();

      if (data.business) {
        setBusinesses(
          businesses.map((business) =>
            business.id === editingBusiness.id ? { ...business, ...data.business } : business,
          ),
        );
        setEditingBusiness(null);
      } else {
        alert(data.error);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Businesses</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {businesses.length} businesses enregistrés
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant={showCreateForm ? "outline" : "primary"}
        >
          {showCreateForm ? "Annuler" : "Ajouter un business"}
        </Button>
      </div>

      {showCreateForm && (
        <Card padding="md" className="border-[var(--color-brand-200)] bg-[var(--color-brand-50)]">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-semibold text-[var(--color-brand-800)]">Création manuelle d&apos;un business</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nom" required value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nom du business" />
              <Input label="Adresse" required value={newAddress} onChange={(event) => setNewAddress(event.target.value)} placeholder="10 Rue de la Paix" />
            </div>
            <Textarea label="Description publique" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Présentation..." rows={3} />
            <Button type="submit" isLoading={isCreating}>Confirmer la création</Button>
          </form>
        </Card>
      )}

      {editingBusiness && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-xl font-bold">Éditer : {editingBusiness.name}</h2>
              <button onClick={() => setEditingBusiness(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nouveau nom" required value={editName} onChange={(event) => setEditName(event.target.value)} />
                <Input label="Nouvelle adresse" required value={editAddress} onChange={(event) => setEditAddress(event.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Téléphone" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} placeholder="+33 1 23 45 67 89" />
                <Input label="Site web" value={editWebsite} onChange={(event) => setEditWebsite(event.target.value)} placeholder="https://..." />
              </div>
              <Textarea label="Nouvelle description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={3} />
              <div className="pt-4 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditingBusiness(null)}>Annuler</Button>
                <Button type="submit" isLoading={isUpdating}>Sauvegarder</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {businesses.length === 0 ? (
        <EmptyState
          icon={<Store className="w-8 h-8" />}
          title="Aucun business"
          description="Les businesses apparaîtront ici après leur inscription."
        />
      ) : (
        <div className="space-y-3">
          {businesses.map((business) => (
            <Card key={business.id} hover padding="sm">
              <div className="flex items-center justify-between p-2 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {business.logoUrl ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--color-border)] shrink-0">
                      <Image src={business.logoUrl} alt={business.name} width={40} height={40} className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-border)] flex items-center justify-center shrink-0 font-black text-[var(--color-brand-600)]">
                      {business.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/r/${business.slug}`} target="_blank" className="font-semibold hover:underline text-[var(--color-brand-600)] text-lg">
                        {business.name}
                      </Link>
                      <Badge variant={business.isActive ? "success" : "danger"}>
                        {business.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] italic">
                      {business.address || "Aucune adresse renseignée"}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      /{business.slug} · {business._count?.reviews || 0} avis · Créé le {formatDate(business.createdAt)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Responsables : {business.memberships.length ? business.memberships.map((m) => m.user.email).join(", ") : "Aucun responsable"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(business)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Modifier
                    </Button>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant={business.isActive ? "secondary" : "primary"}
                      onClick={async () => {
                        await fetch("/api/admin/businesses", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: business.id, isActive: !business.isActive }),
                        });
                        setBusinesses(
                          businesses.map((item) =>
                            item.id === business.id ? { ...item, isActive: !business.isActive } : item,
                          ),
                        );
                      }}
                    >
                      {business.isActive ? "Bloquer" : "Débloquer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        if (confirm("Êtes-vous sûr de vouloir supprimer définitivement ce business et ses avis ?")) {
                          await fetch(`/api/admin/businesses?id=${business.id}`, { method: "DELETE" });
                          setBusinesses(businesses.filter((item) => item.id !== business.id));
                        }
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Check admin/businesses API also returns phone/website/logoUrl**

Read `src/app/api/admin/businesses/route.ts` — verify the GET select includes `phone`, `website`, `logoUrl`. If missing, add them.

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/businesses/page.tsx
git commit -m "feat: admin businesses shows logo avatar, edit modal has phone/website"
```

---

## Self-Review

**Spec coverage:**
- ✅ BusinessPhoto model (Task 1)
- ✅ UploadThing router + API route (Task 2)
- ✅ Photo delete + reorder routes (Task 3)
- ✅ Business API GET/PATCH includes logoUrl + photos (Task 4)
- ✅ Layout C: hero photo zone, name+score overlay, action row (Task 5)
- ✅ Info cards (contact + about), only shown if non-empty (Task 5)
- ✅ Criteria vertical bar chart (Task 5)
- ✅ CTA banner for customer type (Task 5)
- ✅ ReviewsClient filter chips + 2-col review grid (Task 5)
- ✅ Loading skeleton updated to match Layout C (Task 5)
- ✅ Dashboard: logo section + photo gallery with delete + up/down reorder (Task 6)
- ✅ Admin: logo avatar in list, phone/website in edit modal (Task 7)
- ✅ Non-goals preserved: no AI summaries, no map, no DnD library added

**Gaps / watch items:**
- Task 2 Step 5 (env vars) is a manual step — subagent cannot complete it, note this to user.
- Task 7 Step 2 requires reading admin API to confirm field coverage — included as explicit step.
- `useUploadThing` from `@uploadthing/react` requires `"use client"` — settings page already is a client component. ✅
- `next/image` requires `utfs.io` in remotePatterns — covered in Task 2 Step 4. ✅
