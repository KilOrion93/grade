# Layout, Navigation & Security Fixes — Design Spec
**Date:** 2026-05-06  
**Status:** Approved by user

---

## Understanding Summary

- **What:** Fix layout inconsistencies, unreachable routes, security holes, and code quality issues across the Grade app
- **Why:** Public pages have 6 separate inline headers (maintenance burden), /avis is unreachable from home, /onboarding is unprotected, JWT has hardcoded fallback secret
- **Who:** All users — public visitors (annuaire/SEO), business owners (dashboard), admins
- **Constraints:** Keep actual `/logo.png`, match existing brand tokens (globals.css), no new features
- **Non-goals:** Redesign, new pages, billing changes, dashboard redesign

---

## Decisions

| Decision | Choice | Alternatives Considered | Reason |
|---|---|---|---|
| Public header | Shared `<PublicHeader>` component | Keep per-page inline headers | DRY, consistency, one place to update |
| Nav links | Logo + Annuaire (/avis) + Connexion + Essai gratuit CTA | Full marketing nav (more links) | Lean, focused — matches existing style |
| Inner page nav | Breadcrumb bar below sticky header | No breadcrumb | SEO + user orientation on directory pages |
| Directory consolidation | /businesses → redirect to /avis | Keep both | /avis has search; /businesses is redundant |
| JWT hardening | Remove fallback, throw if JWT_SECRET missing | Keep fallback | Fallback is a known string = security hole |
| /onboarding protection | Add to middleware matcher | Leave unprotected (server action protects) | Defense in depth; page should not render for guests |

---

## Design

### 1. Shared `<PublicHeader>` component
**File:** `src/components/public/public-header.tsx`

Props:
```ts
interface PublicHeaderProps {
  breadcrumbs?: { label: string; href?: string }[]
}
```

Renders:
- Sticky header: `logo.png` (32×32) + "Grade" wordmark → links to `/`
- Nav: "Annuaire" → `/avis` (active state when pathname starts with `/avis`)
- Auth area: "Connexion" ghost btn + "Essai gratuit" primary btn → both `/login`
- If `breadcrumbs` prop provided: renders breadcrumb bar below sticky header

Replace inline `<header>` in: `page.tsx` (home), `businesses/page.tsx`, `avis/page.tsx`, `avis/search/page.tsx`, `avis/[city]/page.tsx`, `avis/[city]/[slug]/page.tsx`, `r/[slug]/page.tsx`

### 2. Route fixes
- `avis/[city]/[slug]/page.tsx:307` — `/register` → `/login`
- `r/[slug]/page.tsx:72` — "Retour à l'annuaire" → `/avis` (was `/businesses`)
- `businesses/page.tsx` → convert to redirect: `redirect('/avis')`

### 3. Middleware — protect /onboarding
Add `/onboarding` to `config.matcher` in `middleware.ts`.

### 4. Security — JWT hardening
`src/lib/session.ts` and `src/middleware.ts`:
- Remove `|| "fallback-secret-not-for-production"` 
- Add: `if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET env var is required")`
- Both files define `JWT_SECRET_KEY` independently — extract to shared `src/lib/jwt.ts`

### 5. Validation fix
`src/lib/validations.ts:5` — `loginSchema` password min: 6 → 8 chars (match register)

### 6. Type safety
`src/app/r/[slug]/page.tsx` and `src/app/businesses/page.tsx`:
- Replace `(business as any).citySlug` and `(business as any).description` with proper Prisma select types or extended type

### 7. Onboarding — router fix
`src/app/onboarding/page.tsx:26`:
- `window.location.href = "/dashboard"` → `router.push("/dashboard")`

---

## Assumptions
- `JWT_SECRET` is set in the production env (Vercel env vars). Throwing on startup is correct behavior.
- `/businesses` has no external inbound links worth preserving — redirect is safe. If it does, a 301 redirect is still correct.
- Prisma schema already has `citySlug` and `description` fields — just need proper TypeScript types, no migration needed.

---

## Open Questions
None — all resolved in brainstorming session.
