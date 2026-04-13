import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";
import { Card, Button, Badge } from "@/components/ui";
import { CreditCard, CheckCircle2, ShieldCheck, Zap, Star } from "lucide-react";

export default async function BillingPage() {
  const session = await requireSession();

  // On récupère le business de l'utilisateur avec son abonnement rattaché
  const business = await db.business.findFirst({
    where: { memberships: { some: { userId: session.userId } } },
    include: {
      subscription: {
        include: { plan: true }
      }
    }
  });

  // Si pas d'abonnement actif, on affiche le plan par défaut (le moins cher)
  let activePlan = business?.subscription?.plan;
  const isActive = !!business?.subscription;

  if (!activePlan) {
    const defaultPlan = await db.subscriptionPlan.findFirst({ orderBy: { price: "asc" } });
    activePlan = defaultPlan || undefined;
  }

  // Tous les plans pour afficher les upgrades potentiels
  const allPlans = await db.subscriptionPlan.findMany({ orderBy: { price: "asc" } });
  const upgradePlan = allPlans.length > 1 ? allPlans[allPlans.length - 1] : null;

  const getFeatures = (plan: any) => {
    if (!plan) return [];
    const f = [];
    f.push(plan.maxBusinesses === -1 ? "Businesses illimités" : `${plan.maxBusinesses} business(es)`);
    f.push(plan.maxTokensPerMonth === -1 ? "Tokens illimités" : `${plan.maxTokensPerMonth} tokens / mois`);
    if (plan.hasAnalytics) f.push("Analytics avancés");
    if (plan.hasAiSummary) f.push("Résumé par IA");
    if (plan.hasPosIntegration) f.push("Intégration POS");
    if (plan.hasDedicatedApi) f.push("API dédiée");
    if (plan.hasPrioritySupport) f.push("Support prioritaire");
    return f;
  };

  const activeFeatures = getFeatures(activePlan);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)]">Abonnement & Facturation</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Gérez votre offre Grade et consultez vos factures.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan Card */}
        <Card className="lg:col-span-2 p-8 border-[var(--color-brand-100)] bg-gradient-to-br from-white to-[var(--color-brand-50)]/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <Badge variant={isActive ? "success" : "info"} className="mb-2">
                {isActive ? "Abonnement Actif" : "Plan par défaut"}
              </Badge>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                Offre {activePlan?.name || "Standard"} 
                <span className="text-sm font-normal text-[var(--color-text-secondary)]">({activePlan?.price || 0}€ / mois)</span>
              </h2>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Modifier le mode de paiement
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Fonctionnalités du plan</p>
              <ul className="space-y-3">
                {activeFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-white/80 border border-[var(--color-brand-100)] rounded-2xl p-6 space-y-4 shadow-inner">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-100)] flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[var(--color-brand-600)]" />
                 </div>
                 <div>
                   <p className="text-sm text-[var(--color-text-secondary)]">Prochain prélèvement</p>
                   <p className="font-bold text-lg">12 Mai 2026</p>
                 </div>
               </div>
               <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-xs font-medium text-[var(--color-text-muted)]">
                    <span>Tokens utilisés ce mois</span>
                    <span>0</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--color-bg-muted)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-brand-500)] w-[0%]" />
                  </div>
               </div>
            </div>
          </div>
        </Card>

        {/* Upgrade Card */}
        {upgradePlan && (
          <div className="bg-gradient-to-b from-[var(--color-brand-600)] to-[var(--color-brand-800)] rounded-[2rem] p-8 text-white shadow-xl shadow-[var(--color-brand-200)] flex flex-col justify-between">
             <div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                   <Star className="w-6 h-6 text-white fill-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Besoin d'aller plus loin ?</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-6 italic">
                  Débloquez le plan {upgradePlan.name} pour scaler votre activité et accroitre votre confiance client.
                </p>
                <ul className="space-y-3 mb-8 opacity-90">
                   {getFeatures(upgradePlan).slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                           <ShieldCheck className="w-3 h-3" />
                        </div>
                        {f}
                      </li>
                   ))}
                </ul>
             </div>
             
             <Button className="w-full bg-white text-[var(--color-brand-600)] hover:bg-white/90 font-bold py-6 text-lg rounded-2xl">
                Passer au plan {upgradePlan.name}
             </Button>
          </div>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-bold">Historique des factures</h3>
          <Button variant="ghost" size="sm">Tout télécharger</Button>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          <div className="px-8 py-12 text-center text-[var(--color-text-muted)] text-sm italic">
            Aucune facture disponible pour le moment.
          </div>
        </div>
      </Card>
    </div>
  );
}
