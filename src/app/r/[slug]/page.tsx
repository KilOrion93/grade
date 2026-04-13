import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, ArrowRight, CheckCircle2, ChevronRight, Quote, Info } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
  });

  if (!business) return { title: "Business introuvable" };

  return {
    title: `Avis ${business.name} — Vérifié par Grade`,
    description: (business as any).description || `Découvrez tous les avis vérifiés et authentiques pour ${business.name}.`,
  };
}

export default async function BusinessVitrinePage({ params }: PageProps) {
  const { slug } = await params;
  const business = await db.business.findUnique({
    where: { slug },
  });

  if (!business || !business.isActive) {
    notFound();
  }

  const reviews = await db.review.findMany({
    where: {
      businessId: business.id,
      moderationStatus: "PUBLISHED",
      visibilityType: "PUBLIC",
    },
    include: {
      criterionScores: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const avg = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.overallScore, 0) / reviews.length).toFixed(1) : "—";
  
  const address = business.address || "Adresse non renseignée";
  const desc = (business as any).description || "Cet établissement n'a pas encore ajouté de présentation. Rejoignez les clients vérifiés en laissant le premier avis !";

  return (
    <main className="min-h-screen bg-[var(--color-bg-subtle)] pb-24 font-sans text-[var(--color-text)]">
      
      {/* Header NavBar */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Image 
              src="/logo.png" 
              alt="Grade Logo" 
              width={32} 
              height={32}
            />
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
             <Link href="/businesses" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1">
               <ChevronRight className="w-4 h-4" /> Retour à l'annuaire
             </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-0 pt-10 relative z-10">
        
        {/* Profile Card */}
        <div className="bg-white border border-[var(--color-border)] rounded-[2rem] p-8 md:p-12 shadow-[var(--shadow-xl)] flex flex-col md:flex-row gap-8 items-center md:items-start transition-all relative overflow-hidden">
             {/* Decorative Top Banner */}
             <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-400)] opacity-10" />
             
             {/* Logo / Initial */}
             <div className="shrink-0 relative mt-4 md:mt-0 z-10">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white border-4 border-white shadow-[var(--shadow-md)] flex items-center justify-center text-5xl font-black text-[var(--color-brand-600)] relative z-10 ring-1 ring-[var(--color-border)]">
                   {business.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-max px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center gap-1.5 z-20 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Certifié</span>
                </div>
             </div>

             {/* Info */}
             <div className="flex-1 text-center md:text-left space-y-5 z-10">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[var(--color-text)]">
                  {business.name}
                </h1>
                
                <div className="flex flex-col gap-3">
                  <p className="flex justify-center md:justify-start items-start gap-2 text-[var(--color-text-secondary)] font-medium">
                    <MapPin className="w-5 h-5 text-[var(--color-brand-500)] shrink-0 mt-0.5" /> 
                    <span className={!business.address ? "italic text-[var(--color-text-muted)]" : ""}>{address}</span>
                  </p>

                  <div className="flex justify-center md:justify-start items-start gap-2 text-[var(--color-text-secondary)]">
                    <Info className="w-5 h-5 text-[var(--color-brand-400)] shrink-0 mt-1" />
                    <p className={`text-sm md:text-base leading-relaxed max-w-2xl bg-[var(--color-bg-subtle)] p-4 rounded-2xl border border-[var(--color-border)] ${!(business as any).description ? "italic text-[var(--color-text-muted)]" : ""}`}>
                      {desc}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center md:justify-start gap-4 flex-wrap">
                   <div className="flex items-end gap-2 bg-yellow-50 px-4 py-2 rounded-2xl border border-yellow-200/50">
                     <span className="text-4xl font-extrabold tabular-nums tracking-tighter text-yellow-500">{avg}</span>
                     <span className="text-yellow-600/60 font-medium mb-1.5 text-lg">/5</span>
                   </div>
                   <div className="w-px h-8 bg-[var(--color-border)] hidden md:block" />
                   <div className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-2xl border border-[var(--color-border)]">
                     <div className="flex -space-x-2">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-yellow-100 flex items-center justify-center">
                           <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                         </div>
                       ))}
                     </div>
                     <span className="text-sm font-bold text-[var(--color-text-secondary)] ml-2">{reviews.length} avis certifiés</span>
                   </div>
                </div>
             </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 relative z-20">
          <Link href={`/r/${business.slug}/review`} className="group flex flex-col md:flex-row items-center justify-between p-6 rounded-[1.5rem] bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-brand-500)] hover:from-[var(--color-brand-700)] hover:to-[var(--color-brand-600)] shadow-lg overflow-hidden transition-all duration-300 hover:scale-[1.01] gap-4">
            <div className="relative flex items-center gap-5 text-center md:text-left">
              <div className="hidden md:flex w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-white tracking-wide">Vous avez visité {business.name} ?</h3>
                <p className="text-[var(--color-brand-50)] text-sm font-medium">Munissez-vous de votre reçu et laissez une note encadrée par notre solution de vérification.</p>
              </div>
            </div>
            <div className="w-full md:w-auto px-6 py-3 rounded-xl bg-white text-[var(--color-brand-600)] font-bold flex items-center justify-center gap-2 group-hover:shadow-md transition-all">
              Laisser un avis <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Public Reviews List */}
        <div className="mt-16 space-y-8">
          <div className="flex items-end justify-between px-2">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-text)]">Expériences certifiées</h2>
              <p className="text-[var(--color-text-secondary)] text-sm mt-1">Tous les témoignages proviennent de véritables clients de cet établissement.</p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="p-12 rounded-[2rem] bg-white border border-[var(--color-border)] shadow-sm text-center">
              <div className="w-16 h-16 bg-[var(--color-bg-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
                 <Quote className="w-6 h-6 text-[var(--color-text-muted)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">Soyez le pionnier</h3>
              <p className="text-[var(--color-text-secondary)]">Il n'y a pas encore d'avis validés publiquement pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-6 md:p-8 rounded-[2rem] bg-white border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200">
                       <span className="text-xl font-black">{rev.overallScore}</span>
                       <Star className="w-4 h-4 fill-current" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 justify-end bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Achat Vérifié
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2 font-medium">{rev.createdAt.toLocaleDateString("fr-FR", { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  
                  {rev.comment && (
                     <div className="mb-6 relative">
                       <p className="text-[var(--color-text-secondary)] leading-relaxed text-[15px] italic border-l-4 border-[var(--color-brand-100)] pl-4">
                         "{rev.comment}"
                       </p>
                     </div>
                  )}
                  
                  <div className="pt-5 border-t border-[var(--color-border)] grid grid-cols-2 gap-x-6 gap-y-3">
                    {rev.criterionScores.map(c => (
                      <div key={c.id} className="flex justify-between items-center group/crit">
                        <span className="text-xs font-semibold text-[var(--color-text-muted)]">{c.criterionName}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-[var(--color-text)]">{c.score}</span>
                          <Star className="w-3.5 h-3.5 fill-[var(--color-border-hover)] text-[var(--color-border-hover)]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
