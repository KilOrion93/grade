# Business Page Redesign + Image Upload — Design Spec
**Date:** 2026-05-06
**Status:** Approved by user (Layout C selected)

---

## Understanding Summary

- **What:** Redesign `/avis/[city]/[slug]` to Layout C (hero photo, criteria bars, filter chips, 2-col reviews). Add logo + photo upload for businesses. Store in DB. Expose in onboarding, dashboard settings, admin.
- **Why:** Current page has no images, no description shown, no phone/website CTAs, no review filtering — bare and uncompelling for SEO and conversion.
- **Who:** Public visitors (SEO/discovery), business owners (manage photos/logo), admins (edit any business).
- **Constraints:** Next.js 16 App Router, Prisma/PostgreSQL, Tailwind v4 + CSS tokens, UploadThing for file storage, no test suite.
- **Non-goals:** AI summaries, map embed, review voting, POS integration.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Image storage | UploadThing (free tier) | Native Next.js App Router support, 2GB free, simplest setup |
| Photos model | New `BusinessPhoto` model (id, businessId, url, order) | Clean, orderable, cascade delete |
| Review filtering | Client component with URL search params (?stars=5) | SEO-friendly, shareable links |
| Onboarding photo step | Optional — skip allowed | Don't block onboarding flow; photos added later in settings |
| Logo vs photos | Logo = single `logoUrl` on Business (existing field). Photos = BusinessPhoto[] | Logo is identity, photos are gallery |
| Admin photo edit | Existing admin/businesses page — add logo+photo management | No new admin pages needed |

---

## Design — Layout C

### `/avis/[city]/[slug]/page.tsx`

Structure (top to bottom):

1. **PublicHeader** with breadcrumbs (existing)
2. **Hero photo zone** — 240px tall, 3-slot grid showing business photos (or blue gradient fallback). Business name + score pill overlaid at bottom via absolute positioning.
3. **Action row** — Certifié badge + "Appeler" ghost btn (if phone) + "Site web" ghost btn (if website). Inline, below hero.
4. **Two info cards** (grid 2-col on desktop, stacked on mobile):
   - Left: Contact (phone, website, address)
   - Right: À propos (description)
   - Both hidden if both empty
5. **Criteria card** — vertical bar chart (5 bars, one per criterion). Height proportional to score/5. Score number above bar, criterion label below.
6. **CTA banner** — gradient blue banner "Vous avez visité X ?" + "Laisser un avis →" button. Only shown for customer type.
7. **Review filter chips** — "Tous (N)", "5★ (N)", "4★ (N)", etc. Client component using `useRouter`/`useSearchParams`. Active chip highlighted brand-blue.
8. **Review grid** — 2-col on desktop (`sm:grid-cols-2`). Each card: score pill (yellow), verified badge (green), date, comment (italic, left border brand-100), criteria rows. Owner response if exists (existing).
9. **Nearby section** (existing, unchanged)

### Files changed

- `src/app/avis/[city]/[slug]/page.tsx` — full rewrite (server component stays, extract `ReviewsClient` for filtering)
- `src/components/public/reviews-client.tsx` — NEW: client component for filter chips + filtered review list
- `src/app/avis/[city]/[slug]/loading.tsx` — update skeleton to match new layout

---

## Design — Image Upload

### UploadThing setup

- Install: `uploadthing`, `@uploadthing/react`, `@uploadthing/next`
- `src/lib/uploadthing.ts` — create router with two endpoints:
  - `businessLogo` — max 1 file, image only, max 2MB
  - `businessPhotos` — max 6 files, images only, max 4MB each
  - Both require authenticated session + business ownership check
- `src/app/api/uploadthing/route.ts` — Next.js handler (GET + POST)
- Add `UPLOADTHING_SECRET` + `UPLOADTHING_APP_ID` to env vars

### DB schema

Add to `prisma/schema.prisma`:

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

Add to Business model:
```prisma
photos     BusinessPhoto[]
```

Add to `next.config.ts` — `images.remotePatterns` for UploadThing CDN (`utfs.io`).

### API routes

- `src/app/api/business/photos/route.ts` — DELETE handler: removes a BusinessPhoto by id (requires ownership)
- `src/app/api/business/photos/reorder/route.ts` — PATCH: updates `order` for list of photo ids (requires ownership)

---

## Design — Onboarding

`src/app/onboarding/page.tsx` — already collects name/address/city/phone/website/description. No change to step 1.

After successful business creation, the page currently redirects to `/dashboard/billing`. Keep this. Photos/logo are set via dashboard settings — don't block onboarding with upload step.

---

## Design — Dashboard Settings

`src/app/dashboard/settings/page.tsx` — add two new sections above existing form:

1. **Logo section** — current logo (or placeholder circle with first letter), UploadThing `<UploadButton>` component. On upload success, PATCH `/api/business` with `{ id, logoUrl }`. Show loading state.

2. **Photos gallery section** — grid of uploaded photos (up to 6). Each photo has × delete button. Upload button if < 6 photos. On upload: POST to create BusinessPhoto. On delete: DELETE `/api/business/photos`. Drag to reorder (simple up/down arrows, not DnD — no new deps).

`src/app/api/business/route.ts` PATCH — already handles `logoUrl` field (check: if not in Zod schema yet, add it).

---

## Design — Admin

`src/app/admin/businesses/page.tsx` — add logo display in business list (small avatar showing logoUrl if set, else letter). 

No full admin photo management needed — admins can edit business info via existing PATCH route. If needed later, dashboard settings flow covers owner use case.

---

## Assumptions

- UploadThing free tier (2GB storage) sufficient for MVP.
- `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` will be added to Vercel env vars after setup.
- Review filter is client-side only (no DB query per filter) — 100 reviews max already loaded.
- Existing `logoUrl` field on Business is sufficient for logo (no migration needed, just populate it).
- `BusinessPhoto` model requires `npx prisma db push` after schema change.
- Photos are optional everywhere — pages degrade gracefully with gradient fallback.
