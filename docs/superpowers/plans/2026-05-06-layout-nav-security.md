# Layout, Nav & Security Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all public-page layout inconsistencies, unreachable routes, and security issues identified in the audit.

**Architecture:** Create one shared `<PublicHeader>` component, replace 6 inline headers, fix 3 security issues, fix broken route links, and harden JWT handling via a shared module.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma, Tailwind CSS v4, `jose` for JWT, `next/navigation` hooks.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| **Create** | `src/lib/jwt.ts` | Single source of truth for JWT_SECRET_KEY |
| **Create** | `src/components/public/public-header.tsx` | Shared sticky header for all public pages |
| **Modify** | `src/lib/session.ts` | Import JWT_SECRET_KEY from `src/lib/jwt.ts` |
| **Modify** | `src/middleware.ts` | Import JWT_SECRET_KEY, add `/onboarding` to matcher |
| **Modify** | `src/lib/validations.ts` | Fix loginSchema password min 6→8 |
| **Modify** | `src/app/page.tsx` | Replace inline `<nav>` with `<PublicHeader>` |
| **Modify** | `src/app/avis/page.tsx` | Replace inline `<header>` with `<PublicHeader>` |
| **Modify** | `src/app/avis/search/page.tsx` | Replace inline `<header>` with `<PublicHeader>` |
| **Modify** | `src/app/avis/[city]/page.tsx` | Replace inline `<header>` with `<PublicHeader>` |
| **Modify** | `src/app/avis/[city]/[slug]/page.tsx` | Replace inline `<header>`, fix `/register`→`/login` |
| **Modify** | `src/app/r/[slug]/page.tsx` | Replace inline `<header>`, fix breadcrumb→`/avis`, remove `as any` |
| **Modify** | `src/app/businesses/page.tsx` | Replace with redirect to `/avis` |
| **Modify** | `src/app/onboarding/page.tsx` | `window.location.href` → `router.push` |

---

## Task 1: Shared JWT module

**Files:**
- Create: `src/lib/jwt.ts`
- Modify: `src/lib/session.ts`
- Modify: `src/middleware.ts`

- [ ] **Step 1.1 — Create `src/lib/jwt.ts`**

```typescript
import { TextEncoder } from "util";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
```

- [ ] **Step 1.2 — Update `src/lib/session.ts`**

Remove the existing `JWT_SECRET_KEY` definition (lines 4-6) and add the import:

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { JWT_SECRET_KEY } from "@/lib/jwt";
```

The rest of `session.ts` stays unchanged — `JWT_SECRET_KEY` usage is the same.

- [ ] **Step 1.3 — Update `src/middleware.ts`**

Remove the existing `JWT_SECRET_KEY` definition (lines 4-6) and add the import:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET_KEY } from "@/lib/jwt";
```

Also add `/onboarding` to the matcher at the bottom of the file:

```typescript
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/onboarding",
    "/api/analytics/:path*",
    "/api/reviews/:path*",
    "/api/export/:path*",
    "/api/admin/:path*",
  ],
};
```

- [ ] **Step 1.4 — Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to JWT_SECRET_KEY. (If `process.env.JWT_SECRET` type check fails, that's fine — it's caught at runtime.)

- [ ] **Step 1.5 — Commit**

```bash
git add src/lib/jwt.ts src/lib/session.ts src/middleware.ts
git commit -m "security: extract shared JWT_SECRET_KEY, remove fallback secret, protect /onboarding"
```

---

## Task 2: Fix validation — login password min length

**Files:**
- Modify: `src/lib/validations.ts`

- [ ] **Step 2.1 — Update loginSchema**

In `src/lib/validations.ts`, change line 5:

```typescript
// Before
password: z.string().min(6, "Mot de passe trop court (min. 6 caractères)"),

// After
password: z.string().min(8, "Mot de passe trop court (min. 8 caractères)"),
```

- [ ] **Step 2.2 — Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 2.3 — Commit**

```bash
git add src/lib/validations.ts
git commit -m "security: enforce 8-char minimum password on login (matches register)"
```

---

## Task 3: Remove stale `as any` casts in `r/[slug]/page.tsx`

**Files:**
- Modify: `src/app/r/[slug]/page.tsx`

The Prisma `Business` model has `citySlug` and `description` fields in the schema. The `as any` casts are stale.

- [ ] **Step 3.1 — Fix generateMetadata**

Line 21: remove `as any`:
```typescript
// Before
description: (business as any).description || `Découvrez tous les avis...`,

// After
description: business.description || `Découvrez tous les avis vérifiés et authentiques pour ${business.name}.`,
```

- [ ] **Step 3.2 — Fix redirect check**

Lines 35-37: remove `as any`:
```typescript
// Before
if ((business as any).citySlug) {
  redirect(`/avis/${(business as any).citySlug}/${business.slug}`)
}

// After
if (business.citySlug) {
  redirect(`/avis/${business.citySlug}/${business.slug}`)
}
```

- [ ] **Step 3.3 — Fix desc fallback**

Line 55: remove `as any`:
```typescript
// Before
const desc = (business as any).description || "Cet établissement n'a pas encore...";

// After
const desc = business.description || "Cet établissement n'a pas encore ajouté de présentation. Rejoignez les clients vérifiés en laissant le premier avis !";
```

- [ ] **Step 3.4 — Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3.5 — Commit**

```bash
git add src/app/r/[slug]/page.tsx
git commit -m "fix: remove stale as-any casts — citySlug and description are in Prisma schema"
```

---

## Task 4: Fix `window.location.href` in onboarding

**Files:**
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 4.1 — Replace navigation call**

`useRouter` is already imported. Change line 26:

```typescript
// Before
window.location.href = "/dashboard";

// After
router.push("/dashboard");
```

- [ ] **Step 4.2 — Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4.3 — Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "fix: use router.push instead of window.location.href in onboarding"
```

---

## Task 5: Create shared `<PublicHeader>` component

**Files:**
- Create: `src/components/public/public-header.tsx`

This replaces the 6 separate inline `<header>` blocks. Uses actual `/logo.png`.

- [ ] **Step 5.1 — Create the component**

```typescript
// src/components/public/public-header.tsx
import Link from "next/link";
import Image from "next/image";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PublicHeaderProps {
  breadcrumbs?: Breadcrumb[];
}

export default function PublicHeader({ breadcrumbs }: PublicHeaderProps) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Grade" width={32} height={32} />
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/avis"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-3 py-2 rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors"
            >
              Annuaire
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-3 py-2 rounded-lg hover:bg-[var(--color-bg-muted)] transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/login"
              className="ml-1 text-sm font-semibold text-white bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] px-4 py-2 rounded-lg transition-colors"
            >
              Essai gratuit
            </Link>
          </nav>
        </div>
      </header>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[var(--color-border-hover)]">›</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[var(--color-brand-600)] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--color-text-secondary)]">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 5.2 — Verify**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5.3 — Commit**

```bash
git add src/components/public/public-header.tsx
git commit -m "feat: add shared PublicHeader component with breadcrumb support"
```

---

## Task 6: Replace inline header — home page (`src/app/page.tsx`)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 6.1 — Add import**

At top of `src/app/page.tsx`, add:
```typescript
import PublicHeader from "@/components/public/public-header";
```

Remove imports that are only used in the old inline nav: `Image` from the nav use (keep it if used elsewhere in the file), `Link` (keep — still used in feature cards).

- [ ] **Step 6.2 — Replace the inline `<nav>` block**

The home page has its nav embedded inside the hero `<section>` (lines 39-62 in the original). Remove the entire `<nav>` block:

```tsx
{/* DELETE THIS ENTIRE BLOCK */}
<nav className="flex items-center justify-between mb-16">
  <div className="flex items-center">
    <Image src="/logo.png" alt="Grade Logo" width={40} height={40} />
  </div>
  <div className="flex items-center gap-3">
    <Link href="/login" className="...">Connexion</Link>
    <Link href="/login" className="...">Essai gratuit</Link>
  </div>
</nav>
```

And wrap the entire `<main>` with the header above it. Change the return to:

```tsx
return (
  <>
    <PublicHeader />
    <main className="min-h-screen">
      {/* Hero — remove the mb-16 from the hero div now that nav is gone */}
      <section className="relative overflow-hidden">
        ...
```

Also update the secondary CTA button in the hero (currently links to `/businesses`) to link to `/avis`:

```tsx
// Before
<Link href="/businesses" className="...">
  Explorer nos établissements
</Link>

// After
<Link href="/avis" className="...">
  Explorer l'annuaire
</Link>
```

Also remove the inline `<footer>` at the bottom of `page.tsx` and replace with a shared minimal footer (inline is fine here — the footer is simple and doesn't need a component):

Keep the footer as-is — it only lives on the home page.

- [ ] **Step 6.3 — Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 6.4 — Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace home page inline nav with shared PublicHeader, fix CTA to /avis"
```

---

## Task 7: Replace inline header — `/avis` page

**Files:**
- Modify: `src/app/avis/page.tsx`

- [ ] **Step 7.1 — Add import**

```typescript
import PublicHeader from "@/components/public/public-header";
```

- [ ] **Step 7.2 — Replace inline `<header>`**

Delete the entire `<header>` block (lines 44-51 in original):

```tsx
{/* DELETE */}
<header className="sticky top-0 z-50 ...">
  <div className="...">
    <Link href="/" className="flex items-center">
      <Image src="/logo.png" alt="Grade" width={32} height={32} />
    </Link>
    <Link href="/login" className="...">Connexion</Link>
  </div>
</header>
```

Replace with `<PublicHeader />` before the `<main>`:

```tsx
return (
  <>
    <PublicHeader />
    <main className="min-h-screen bg-[var(--color-bg-subtle)] font-sans text-[var(--color-text)] pb-20">
      {/* rest unchanged */}
```

Also remove the now-unused `Image` import if it's no longer used in this file. Check — `Image` is only used in the header, so remove it.

- [ ] **Step 7.3 — Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 7.4 — Commit**

```bash
git add src/app/avis/page.tsx
git commit -m "feat: replace /avis inline header with shared PublicHeader"
```

---

## Task 8: Replace inline header — `/avis/search` page

**Files:**
- Modify: `src/app/avis/search/page.tsx`

- [ ] **Step 8.1 — Add import**

```typescript
import PublicHeader from "@/components/public/public-header";
```

- [ ] **Step 8.2 — Replace inline `<header>` and wrap return**

Delete the `<header>` block (lines 43-52 in original). Replace the return with:

```tsx
return (
  <>
    <PublicHeader
      breadcrumbs={[
        { label: "Annuaire", href: "/avis" },
        { label: "Recherche" },
      ]}
    />
    <main className="min-h-screen bg-[var(--color-bg-subtle)] font-sans text-[var(--color-text)] pb-20">
      {/* rest unchanged — remove the old <header> block only */}
```

Remove the now-unused `Image` import.

- [ ] **Step 8.3 — Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 8.4 — Commit**

```bash
git add src/app/avis/search/page.tsx
git commit -m "feat: replace /avis/search inline header with shared PublicHeader"
```

---

## Task 9: Replace inline header — `/avis/[city]` page

**Files:**
- Modify: `src/app/avis/[city]/page.tsx`

- [ ] **Step 9.1 — Add import**

```typescript
import PublicHeader from "@/components/public/public-header";
```

- [ ] **Step 9.2 — Replace inline `<header>` and wrap return**

Delete the `<header>` block (lines 48-57 in original). Replace the return with:

```tsx
return (
  <>
    <PublicHeader
      breadcrumbs={[
        { label: "Annuaire", href: "/avis" },
        { label: cityDisplay },
      ]}
    />
    <main className="min-h-screen bg-[var(--color-bg-subtle)] pb-20 font-sans text-[var(--color-text)]">
      {/* rest unchanged */}
```

Remove the now-unused `Image` import.

- [ ] **Step 9.3 — Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 9.4 — Commit**

```bash
git add "src/app/avis/[city]/page.tsx"
git commit -m "feat: replace /avis/[city] inline header with shared PublicHeader + breadcrumb"
```

---

## Task 10: Replace inline header + fix `/register` link — `/avis/[city]/[slug]` page

**Files:**
- Modify: `src/app/avis/[city]/[slug]/page.tsx`

- [ ] **Step 10.1 — Add import**

```typescript
import PublicHeader from "@/components/public/public-header";
```

- [ ] **Step 10.2 — Replace inline `<header>` and wrap return**

Delete the `<header>` block (lines 159-167 in original). Replace return with:

```tsx
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
      {/* keep JSON-LD scripts at top, then rest unchanged */}
```

- [ ] **Step 10.3 — Fix broken `/register` link**

Line 307: change `/register` to `/login`:

```tsx
// Before
<Link href="/register" className="...">
  Activer Grade gratuitement <ArrowRight className="w-4 h-4" />
</Link>

// After
<Link href="/login" className="...">
  Activer Grade gratuitement <ArrowRight className="w-4 h-4" />
</Link>
```

- [ ] **Step 10.4 — Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 10.5 — Commit**

```bash
git add "src/app/avis/[city]/[slug]/page.tsx"
git commit -m "feat: shared PublicHeader on /avis/[city]/[slug], fix /register→/login broken link"
```

---

## Task 11: Replace inline header + fix breadcrumb — `/r/[slug]` page

**Files:**
- Modify: `src/app/r/[slug]/page.tsx`

- [ ] **Step 11.1 — Add import**

```typescript
import PublicHeader from "@/components/public/public-header";
```

- [ ] **Step 11.2 — Replace inline `<header>` and wrap return**

Delete the `<header>` block (lines 61-77 in original). The breadcrumb on this page should link back to `/avis`, not `/businesses`:

```tsx
return (
  <PublicHeader
    breadcrumbs={[
      { label: "Annuaire", href: "/avis" },
      { label: business.name },
    ]}
  />
  // ... rest of the return
```

Wait — this page has `notFound()` and `redirect()` calls before the return. The structure is:

```tsx
return (
  <>
    <PublicHeader
      breadcrumbs={[
        { label: "Annuaire", href: "/avis" },
        { label: business.name },
      ]}
    />
    <main className="min-h-screen bg-[var(--color-bg-subtle)] pb-24 font-sans text-[var(--color-text)]">
      {/* all existing content unchanged */}
    </main>
  </>
);
```

- [ ] **Step 11.3 — Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 11.4 — Commit**

```bash
git add "src/app/r/[slug]/page.tsx"
git commit -m "feat: shared PublicHeader on /r/[slug], breadcrumb points to /avis"
```

---

## Task 12: Redirect `/businesses` → `/avis`

**Files:**
- Modify: `src/app/businesses/page.tsx`

- [ ] **Step 12.1 — Replace page with redirect**

Replace the entire content of `src/app/businesses/page.tsx` with:

```typescript
import { redirect } from "next/navigation";

export default function BusinessesPage() {
  redirect("/avis");
}
```

This is a server component so `redirect()` works at the top level. Next.js emits a 308 permanent redirect.

- [ ] **Step 12.2 — Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 12.3 — Commit**

```bash
git add src/app/businesses/page.tsx
git commit -m "feat: redirect /businesses → /avis (consolidated into main directory)"
```

---

## Task 13: Verify end-to-end

- [ ] **Step 13.1 — Run dev server**

```bash
npm run dev
```

- [ ] **Step 13.2 — Manual checklist**

Visit each route and confirm:

| Route | Expected |
|---|---|
| `/` | Header shows logo + Annuaire + Connexion + Essai gratuit |
| `/avis` | Same shared header, no breadcrumb |
| `/avis/paris` | Header + breadcrumb: Annuaire › Paris |
| `/avis/paris/some-slug` | Header + breadcrumb: Annuaire › Paris › Name |
| `/r/some-slug` | Header + breadcrumb: Annuaire › Business Name |
| `/businesses` | Redirects to `/avis` |
| `/onboarding` (logged out) | Redirects to `/login` |
| Login with 6-char password | Error: "Mot de passe trop court (min. 8 caractères)" |
| Logo everywhere | Actual `/logo.png`, not placeholder |

- [ ] **Step 13.3 — Final commit**

```bash
git add .
git commit -m "chore: layout/nav/security audit complete — all 13 tasks done"
```
