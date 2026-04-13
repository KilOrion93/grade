import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import {
  QrCode,
  BarChart3,
  Star,
  ArrowRight,
  Smartphone,
  Lock,
  Zap,
  Check,
} from "lucide-react";

export default async function HomePage() {
  const partners = await db.business.findMany({
    where: { isActive: true },
    include: {
      reviews: {
        where: { moderationStatus: "PUBLISHED" },
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand-50)] via-white to-blue-50" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--color-brand-200)] rounded-full mix-blend-multiply blur-xl animate-pulse" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply blur-xl animate-pulse delay-1000" />
          <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply blur-xl animate-pulse delay-500" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
          <nav className="flex items-center justify-between mb-16">
            <div className="flex items-center">
              <Image 
                src="/logo.png" 
                alt="Grade Logo" 
                width={40} 
                height={40}
              />
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/login"
                className="px-4 py-2.5 text-sm font-medium text-white bg-[var(--color-brand-600)] rounded-[var(--radius-lg)] hover:bg-[var(--color-brand-700)] transition-colors shadow-sm"
              >
                Essai gratuit
              </Link>
            </div>
          </nav>

          <div className="text-center max-w-3xl mx-auto animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] text-[var(--color-brand-700)] text-xs font-medium mb-6">
              <Image 
                src="/logo.png" 
                alt="Grade Logo" 
                width={14} 
                height={14}
              />
              Avis vérifiés par preuve de visite
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              Des avis clients{" "}
              <span className="gradient-text">vraiment fiables</span>{" "}
              pour votre commerce
            </h1>
            <p className="mt-6 text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
              Grade associe chaque avis à une preuve de visite vérifiée.
              Fini les faux avis. Analysez vos performances réelles et améliorez
              votre service grâce à des retours authentiques.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-[var(--color-brand-600)] rounded-[var(--radius-xl)] hover:bg-[var(--color-brand-700)] transition-all shadow-lg hover:shadow-xl"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/businesses"
                className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] bg-white border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-sm hover:shadow-md transition-all"
              >
                Explorer nos établissements
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-[var(--color-bg)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">
              Tout ce dont votre commerce a besoin
            </h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Une solution complète pour collecter, vérifier et analyser les avis
              clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: QrCode,
                title: "QR Code intelligent",
                desc: "Générez des QR codes uniques. Vos clients scannent et déposent un avis en moins de 30 secondes.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: Check,
                title: "Vérification par token",
                desc: "Chaque avis est lié à un code de visite unique à usage unique. Impossible de tricher.",
                color: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: BarChart3,
                title: "Analytics en temps réel",
                desc: "Dashboard complet avec moyennes, tendances, répartition des notes et critères détaillés.",
                color: "bg-purple-50 text-purple-600",
              },
              {
                icon: Star,
                title: "5 critères d'évaluation",
                desc: "Accueil, hygiène, rapidité, prix et qualité. Identifiez précisément vos axes d'amélioration.",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: Smartphone,
                title: "Mobile first",
                desc: "Interface optimisée pour les smartphones. Vos clients déposent un avis en toute fluidité.",
                color: "bg-pink-50 text-pink-600",
              },
              {
                icon: Lock,
                title: "Anti-abus intégré",
                desc: "Score de confiance, tokens à usage unique, rate limiting et modération intégrée.",
                color: "bg-red-50 text-red-600",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-lg hover:border-[var(--color-border-hover)] transition-all duration-300"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.color} mb-4`}
                >
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partenaires */}
      <section className="py-20 bg-[var(--color-bg-subtle)] border-y border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Nos établissements de confiance</h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Découvrez les businesses qui s'engagent pour 100% de transparence.
            </p>
          </div>
          
          {partners.length === 0 ? (
            <div className="text-center text-[var(--color-text-muted)]">Aucun partenaire pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {partners.map(p => {
                const avg = p.reviews.length > 0 ? (p.reviews.reduce((acc, r) => acc + r.overallScore, 0) / p.reviews.length).toFixed(1) : "Nouveau";
                return (
                  <Link href={`/r/${p.slug}`} key={p.id} className="group p-5 rounded-2xl bg-white border border-[var(--color-border)] hover:border-[var(--color-brand-300)] shadow-sm hover:shadow-lg transition-all flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-[var(--color-brand-600)] transition-colors">{p.name}</h3>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">{p.reviews.length} avis vérifiés</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between pointer-events-none">
                       <div className="flex items-center gap-1 text-[var(--color-brand-500)] font-semibold">
                         <Star className="w-4 h-4 fill-current"/>
                         <span>{avg}</span>
                       </div>
                       <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-600)] transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Simple comme bonjour</h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              En 3 étapes, collectez des avis fiables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Générez",
                desc: "Créez vos QR codes et tokens de visite depuis votre dashboard.",
                emoji: "🎟️",
              },
              {
                step: "02",
                title: "Collectez",
                desc: "Vos clients scannent le QR code et saisissent leur code de visite.",
                emoji: "📱",
              },
              {
                step: "03",
                title: "Analysez",
                desc: "Consultez vos avis vérifiés et suivez vos performances en temps réel.",
                emoji: "📊",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl mb-4">{item.emoji}</div>
                <div className="text-xs font-bold text-[var(--color-brand-600)] mb-1 tracking-widest">
                  ÉTAPE {item.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-br from-[var(--color-brand-600)] to-[var(--color-brand-800)] text-white shadow-2xl">
            <Zap className="w-10 h-10 mx-auto mb-4 opacity-80" />
            <h2 className="text-3xl font-bold mb-3">
              Prêt à collecter des avis vérifiés ?
            </h2>
            <p className="text-blue-100 mb-8 max-w-lg mx-auto">
              Rejoignez les businesses qui font confiance à Grade pour une
              réputation authentique.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-white text-[var(--color-brand-700)] rounded-[var(--radius-xl)] hover:bg-blue-50 transition-colors shadow-lg"
            >
              Créer mon compte
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="Grade Logo" 
              width={16} 
              height={16}
            />
            <span className="text-sm font-medium">Grade</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} Grade. Avis vérifiés.
          </p>
        </div>
      </footer>
    </main>
  );
}
