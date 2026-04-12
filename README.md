# TrustReview — Plateforme d'avis vérifiés pour restaurants

> Collectez des avis clients vérifiés grâce à un système de preuve de visite par token unique.  
> Dashboard restaurateur complet + Back-office admin + Interface mobile client.

---

## 🚀 Démarrage rapide

### Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | 18+ |
| PostgreSQL | 14+ |
| npm | 9+ |

### 1. Installation

```bash
cd trustreview
npm install
```

### 2. Configuration

Créez/modifiez le fichier `.env` à la racine :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trustreview?schema=public"
JWT_SECRET="changez-cette-cle-en-production-minimum-32-caracteres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="TrustReview"
```

### 3. Base de données

```bash
# Créer la base de données PostgreSQL
# (avec psql ou votre outil favori)
createdb trustreview

# Pousser le schéma Prisma
npm run db:push

# Remplir avec les données de démo
npm run db:seed
```

### 4. Lancement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## 🔑 Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| **Admin** | `admin@trustreview.fr` | `admin123` |
| **Restaurateur** | `marie@lebistrot.fr` | `owner123` |
| **Restaurateur 2** | `pierre@sushi-zen.fr` | `owner123` |

---

## 📱 URLs de test

| Page | URL |
|------|-----|
| Accueil (Landing) | `http://localhost:3000` |
| Connexion | `http://localhost:3000/login` |
| Dashboard restaurateur | `http://localhost:3000/dashboard` |
| Admin | `http://localhost:3000/admin` |
| Avis client - Le Bistrot | `http://localhost:3000/r/le-bistrot-parisien` |
| Avis client - Sushi Zen | `http://localhost:3000/r/sushi-zen` |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js (App Router)            │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Public  │  │Dashboard │  │  Admin Panel   │  │
│  │(Mobile) │  │(Restau.) │  │  (Plateforme)  │  │
│  └────┬────┘  └────┬─────┘  └───────┬────────┘  │
│       │             │                │            │
│  ┌────┴─────────────┴────────────────┴────────┐  │
│  │       Server Actions + API Routes          │  │
│  │  (Auth, Review, Token, Analytics, Admin)   │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴───────────────────────┐  │
│  │      Prisma ORM + PostgreSQL               │  │
│  │  (Users, Restaurants, Reviews, Tokens...)  │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Stack technique

- **Framework** : Next.js 16 (App Router, React 19)
- **Langage** : TypeScript
- **UI** : Tailwind CSS 4
- **ORM** : Prisma 7
- **Base de données** : PostgreSQL
- **Auth** : JWT (jose) + cookies HttpOnly
- **Validation** : Zod
- **Icînes** : Lucide React
- **QR Code** : qrcode (lib Node)

---

## 📂 Structure du projet

```
trustreview/
├── prisma/
│   ├── schema.prisma          # Modèle de données complet
│   └── seed.ts                # Données de démonstration
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing page marketing
│   │   ├── layout.tsx         # Root layout (Inter font)
│   │   ├── globals.css        # Design system CSS tokens
│   │   ├── login/page.tsx     # Login / Register
│   │   ├── r/[slug]/page.tsx  # Interface client public (QR)
│   │   ├── dashboard/         # Espace restaurateur
│   │   │   ├── layout.tsx     # Auth + sidebar
│   │   │   ├── page.tsx       # Overview analytics
│   │   │   ├── reviews/       # Liste des avis
│   │   │   ├── qrcodes/       # Gestion QR codes
│   │   │   ├── tokens/        # Génération tokens
│   │   │   └── settings/      # Paramètres
│   │   ├── admin/             # Back-office admin
│   │   │   ├── layout.tsx     # Auth admin
│   │   │   ├── page.tsx       # Dashboard admin
│   │   │   ├── restaurants/   # Gestion restaurants
│   │   │   ├── users/         # Gestion utilisateurs
│   │   │   ├── reviews/       # Modération avis
│   │   │   ├── logs/          # Journal d'audit
│   │   │   └── plans/         # Plans d'abonnement
│   │   └── api/               # API Routes
│   │       ├── analytics/     # Calculs analytics
│   │       ├── reviews/       # CRUD avis
│   │       ├── export/        # Export CSV
│   │       └── admin/         # API admin
│   ├── actions/               # Server Actions
│   │   ├── auth.ts            # Login, register, logout
│   │   ├── review.ts          # Soumission + validation token
│   │   └── token.ts           # Génération tokens + QR
│   ├── components/
│   │   ├── ui/                # Composants réutilisables
│   │   │   ├── index.tsx      # Button, Input, Card, Badge...
│   │   │   └── star-rating.tsx
│   │   ├── public/
│   │   │   └── review-flow.tsx # Parcours avis client
│   │   ├── dashboard/
│   │   │   └── shell.tsx      # Sidebar + navigation
│   │   └── admin/
│   │       └── shell.tsx      # Sidebar admin
│   ├── lib/
│   │   ├── db.ts              # Prisma singleton
│   │   ├── session.ts         # JWT + cookies
│   │   ├── utils.ts           # Helpers, constantes
│   │   ├── validations.ts     # Schémas Zod
│   │   └── audit.ts           # Journalisation
│   └── middleware.ts          # Protection des routes
├── .env                       # Variables d'environnement
├── package.json
└── README.md
```

---

## 🔒 Modèles de données

| Modèle | Description |
|--------|-------------|
| `User` | Utilisateurs (admin, owner, manager) |
| `Restaurant` | Établissements avec slug unique |
| `StaffMembership` | Lien user ↔ restaurant avec rôle |
| `QrCode` | QR codes générés par restaurant |
| `VisitToken` | Codes de visite uniques à usage unique |
| `Review` | Avis avec note globale, statut, confiance |
| `ReviewCriterionScore` | Notes détaillées par critère |
| `ReviewFlag` | Signalements d'avis |
| `SubscriptionPlan` | Plans tarifaires |
| `Subscription` | Abonnements restaurants |
| `AuditLog` | Journal d'audit des actions |

---

## 🛣 Routes API

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/analytics` | GET | Calculs analytics (exige auth + restaurantId) |
| `/api/reviews` | GET | Liste paginée et filtrée des avis |
| `/api/export` | GET | Export CSV des avis |
| `/api/admin/restaurants` | GET/PATCH | Gestion restaurants (admin) |
| `/api/admin/users` | GET/PATCH | Gestion utilisateurs (admin) |
| `/api/admin/reviews` | GET/PATCH | Modération avis (admin) |
| `/api/admin/logs` | GET | Journal d'audit (admin) |

---

## ✅ Fonctionnalités V1 (implémentées)

- [x] Landing page marketing
- [x] Interface mobile client (QR → token → avis → confirmation)
- [x] 5 critères de notation (accueil, hygiène, rapidité, prix, qualité)
- [x] Tokens de visite à usage unique avec expiration
- [x] Dashboard restaurateur (analytics, avis, QR, tokens)
- [x] Moyennes globales et par critère
- [x] Tendances et répartition des notes
- [x] Avis publics vs privés
- [x] Export CSV
- [x] Multi-établissements par compte
- [x] Back-office admin (restaurants, users, modération, logs, plans)
- [x] Authentification JWT sécurisée
- [x] Middleware de protection des routes
- [x] Score de confiance des avis
- [x] Statuts de modération (pending/published/flagged/rejected)
- [x] Système de signalement
- [x] Pseudonymisation IP
- [x] Journalisation d'audit
- [x] Seed de démonstration complet

## 🔮 Préparé pour le futur

- [ ] Intégration Stripe (tables prêtes)
- [ ] Résumé IA des avis
- [ ] Détection de thèmes récurrents
- [ ] Intégration POS/caisse
- [ ] Stockage S3
- [ ] Redis cache
- [ ] Notifications email/push
- [ ] Gestion équipe avancée (invitations)
- [ ] Widget avis embeddable
- [ ] API publique documentée

---

## 🛠 Commandes utiles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run db:push      # Synchroniser le schéma Prisma → PostgreSQL
npm run db:seed      # Insérer les données de démo
npm run db:reset     # Reset complet (schéma + seed)
npm run db:studio    # Prisma Studio (GUI pour la DB)
```

---

## 📐 Choix d'architecture

1. **Monolithique Next.js** : simplicité de déploiement (Vercel), SSR, colocalisation frontend/backend, Server Actions pour les mutations.
2. **App Router** : layouts imbriqués pour les zones auth, RSC pour le fetching côté serveur.
3. **Server Actions** : mutations sécurisées (login, register, soumission d'avis, génération tokens) sans API REST supplémentaire.
4. **Route Handlers** : pour les endpoints de lecture complexes (analytics, exports) et l'admin.
5. **Transaction Prisma** : la soumission d'avis utilise une transaction atomique pour valider le token ET créer l'avis simultanément, évitant toute double utilisation.
6. **JWT + cookies HttpOnly** : pas de dépendance externe (Auth0, Clerk), contrôle total, sécurisation des cookies.

---

**Made with ❤️ by TrustReview**
