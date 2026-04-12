import { db } from "@/lib/db";
import Link from "next/link";
import { Star, ArrowRight, ShieldCheck, Search, MapPin, Store, Info } from "lucide-react";

export const metadata = {
  title: "Annuaire des restaurants - TrustReview",
  description: "Découvrez tous les établissements enregistrés avec des avis 100% certifiés.",
};

export default async function RestaurantsDirectory() {
  const partners = await db.restaurant.findMany({
    where: { isActive: true },
    include: {
      reviews: {
        where: { moderationStatus: "PUBLISHED" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[var(--color-bg-subtle)] font-sans text-[var(--color-text)] pb-20">
      
      {/* Header NavBar */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-600)] flex items-center justify-center shadow-md">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-[var(--color-text)] group-hover:text-[var(--color-brand-600)] transition-colors">TrustReview</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative pt-16 pb-20 px-4 bg-white border-b border-[var(--color-border)] overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-brand-100)] rounded-full mix-blend-multiply blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
           <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-[var(--color-text)]">
             Tous nos partenaires d'excellence
           </h1>
           <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
             Faites votre choix parmi les établissements qui misent sur la transparence absolue. 
             <span className="text-[var(--color-brand-600)] font-semibold"> Des avis 100% garantis par preuve d'achat.</span>
           </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6 bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
                <Store className="w-5 h-5 text-[var(--color-brand-600)]" />
             </div>
             <h2 className="text-2xl font-bold tracking-tight">{partners.length} établissements</h2>
          </div>
          
          <div className="relative w-full md:w-auto">
             <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
             <input disabled placeholder="Recherche par ville (bientôt...)" className="w-full md:w-80 pl-11 pr-4 py-3 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] cursor-not-allowed focus:outline-none" />
          </div>
        </div>

        {partners.length === 0 ? (
          <div className="text-center p-16 bg-white rounded-[2rem] border border-[var(--color-border)] shadow-sm">
             <p className="text-[var(--color-text-secondary)] text-lg">Aucun partenaire n'est actif pour l'instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {partners.map(p => {
              const avg = p.reviews.length > 0 ? (p.reviews.reduce((acc, r) => acc + r.overallScore, 0) / p.reviews.length).toFixed(1) : "—";
              const addr = p.address || "Adresse non renseignée";
              const desc = (p as any).description || "Cet établissement n'a pas encore ajouté de description globale.";

              return (
                <Link href={`/r/${p.slug}`} key={p.id} className="group relative flex flex-col justify-between bg-white rounded-[2rem] border border-[var(--color-border)] shadow-sm hover:shadow-xl hover:border-[var(--color-brand-200)] transition-all duration-300 overflow-hidden hover:-translate-y-1">
                  <div className="p-8 pb-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-16 h-16 rounded-[1.25rem] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-brand-600)] flex items-center justify-center font-black text-3xl shadow-inner">
                         {p.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {p.reviews.length > 0 ? (
                        <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-600 px-3 py-1.5 rounded-full text-sm font-bold border border-yellow-200">
                           <Star className="w-4 h-4 fill-current"/>
                           <span>{avg}</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] text-xs font-bold border border-[var(--color-border)]">
                           Nouveau
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-2xl font-bold text-[var(--color-text)] mb-3 tracking-tight line-clamp-1">{p.name}</h3>
                    
                    <div className="flex flex-col gap-2 mt-auto">
                      <div className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)] font-medium">
                        <MapPin className="w-4 h-4 text-[var(--color-brand-500)] shrink-0 mt-0.5" />
                        <span className={`line-clamp-2 ${!p.address ? 'italic text-[var(--color-text-muted)]' : ''}`}>{addr}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                        <Info className="w-4 h-4 text-[var(--color-brand-400)] shrink-0 mt-0.5" />
                        <span className={`line-clamp-2 ${!(p as any).description ? 'italic text-[var(--color-text-muted)]' : ''}`}>{desc}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-[var(--color-bg-subtle)] border-t border-[var(--color-border)] flex items-center justify-between mt-auto group-hover:bg-[var(--color-brand-50)] transition-colors">
                    <span className="text-[var(--color-text-secondary)] text-sm font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[var(--color-brand-500)]" /> {p.reviews.length} avis certifiés
                    </span>
                    <span className="text-[var(--color-brand-600)] font-bold text-sm flex items-center gap-1">
                      Vitrine <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  );
}
