"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useBusinessId } from "@/components/dashboard/shell";
import { Badge, Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { CheckCircle2, CreditCard, ShieldCheck, Star, Zap } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  stripePriceId?: string | null;
  maxBusinesses: number;
  maxTokensPerMonth: number;
  hasAiSummary: boolean;
  hasAnalytics: boolean;
  hasPosIntegration: boolean;
  hasDedicatedApi: boolean;
  hasPrioritySupport: boolean;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string | null;
  plan: Plan;
}

interface BillingData {
  business: {
    id: string;
    name: string;
    subscription: Subscription | null;
  };
  plans: Plan[];
}

function getFeatures(plan?: Plan | null) {
  if (!plan) return [];

  const features: string[] = [];
  features.push(plan.maxBusinesses === -1 ? "Businesses illimités" : `${plan.maxBusinesses} business(es)`);
  features.push(plan.maxTokensPerMonth === -1 ? "Tokens illimités" : `${plan.maxTokensPerMonth} tokens / mois`);
  if (plan.hasAnalytics) features.push("Analytics avancés");
  if (plan.hasAiSummary) features.push("Résumé par IA");
  if (plan.hasPosIntegration) features.push("Intégration POS");
  if (plan.hasDedicatedApi) features.push("API dédiée");
  if (plan.hasPrioritySupport) features.push("Support prioritaire");

  return features;
}

export default function BillingClient() {
  const businessId = useBusinessId();
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/billing?businessId=${businessId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger la facturation");
      }

      setData(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur serveur");
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void fetchBilling();
  }, [fetchBilling]);

  const activePlan = useMemo(() => {
    if (!data) return null;
    return data.business.subscription?.plan || data.plans[0] || null;
  }, [data]);

  const availablePlans = useMemo(() => {
    if (!data) return [];
    return data.plans
      .filter((plan) => plan.price > 0 && plan.stripePriceId)
      .sort((a, b) => a.price - b.price);
  }, [data]);

  const activeFeatures = useMemo(() => getFeatures(activePlan), [activePlan]);
  const unsubscribedPlans = useMemo(() => {
    if (!data) return [];
    const activePriceId = data.business.subscription?.plan?.stripePriceId;
    return availablePlans.filter((p) => p.stripePriceId !== activePriceId);
  }, [availablePlans, data]);

  const nextBillingDate = data?.business.subscription?.currentPeriodEnd
    ? new Date(data.business.subscription.currentPeriodEnd).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const openCheckout = useCallback(async (planId: string) => {
    if (!businessId) return;

    setIsCheckoutLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId, planId }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Impossible d'ouvrir Stripe Checkout");
      }

      window.location.href = payload.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Erreur serveur");
      setIsCheckoutLoading(false);
    }
  }, [businessId]);

  const openPortal = useCallback(async () => {
    if (!businessId) return;

    setIsPortalLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Impossible d'ouvrir le portail Stripe");
      }

      window.location.href = payload.url;
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Erreur serveur");
      setIsPortalLoading(false);
    }
  }, [businessId]);

  const syncSubscription = useCallback(async () => {
    if (!businessId) return;
    setIsSyncing(true);
    setError(null);
    try {
      const response = await fetch(`/api/billing/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Synchronisation échouée");
      await fetchBilling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur serveur");
    } finally {
      setIsSyncing(false);
    }
  }, [businessId, fetchBilling]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data || !activePlan) {
    return (
      <EmptyState
        title="Facturation indisponible"
        description={error || "Impossible de charger les informations de facturation."}
      />
    );
  }

  const hasStripeCustomer = !!data.business.subscription?.stripeCustomerId;
  const hasPaidSubscription = ["active", "trialing"].includes(data.business.subscription?.status ?? "");

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)]">Abonnement & Facturation</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Gérez votre offre Grade pour {data.business.name}.</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-medium">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-[var(--color-brand-100)] bg-gradient-to-br from-white to-[var(--color-brand-50)]/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <Badge variant={hasPaidSubscription ? "success" : "warning"} className="mb-2">
                {hasPaidSubscription ? "Abonnement actif" : "Non abonné"}
              </Badge>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                Offre {activePlan.name}
                <span className="text-sm font-normal text-[var(--color-text-secondary)]">({activePlan.price}€ / mois)</span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={openPortal}
                isLoading={isPortalLoading}
                disabled={!hasStripeCustomer}
              >
                <CreditCard className="w-4 h-4" />
                Gérer la facturation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={syncSubscription}
                isLoading={isSyncing}
                title="Synchroniser le statut depuis Stripe"
              >
                Synchroniser
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Fonctionnalités du plan</p>
              <ul className="space-y-3">
                {activeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {feature}
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
                  <p className="text-sm text-[var(--color-text-secondary)]">Prochaine échéance</p>
                  <p className="font-bold text-lg">{nextBillingDate || "Aucune"}</p>
                </div>
              </div>
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-xs font-medium text-[var(--color-text-muted)]">
                  <span>Statut Stripe</span>
                  <span>{data.business.subscription?.status || "inactive"}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-[var(--color-text-muted)]">
                  <span>Fin de période</span>
                  <span>{data.business.subscription?.cancelAtPeriodEnd ? "Oui" : "Non"}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {unsubscribedPlans.map((plan) => (
          <div key={plan.id} className="bg-gradient-to-b from-[var(--color-brand-600)] to-[var(--color-brand-800)] rounded-[2rem] p-8 text-white shadow-xl shadow-[var(--color-brand-200)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                <Star className="w-6 h-6 text-white fill-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">{plan.name}</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                {plan.price}€ / mois · Sans engagement
              </p>
              <ul className="space-y-3 mb-8 opacity-90">
                {getFeatures(plan).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm font-medium">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              className="w-full bg-white text-[var(--color-brand-600)] hover:bg-white/90 font-bold py-6 text-lg rounded-2xl"
              onClick={() => openCheckout(plan.id)}
              isLoading={isCheckoutLoading}
            >
              {hasPaidSubscription ? `Passer au plan ${plan.name}` : `S’abonner — ${plan.price}€ / mois`}
            </Button>
          </div>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-8 py-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-bold">Historique des factures</h3>
          <Button variant="ghost" size="sm" onClick={openPortal} disabled={!hasStripeCustomer} isLoading={isPortalLoading}>
            Ouvrir Stripe
          </Button>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          <div className="px-8 py-12 text-center text-[var(--color-text-muted)] text-sm italic">
            Les factures détaillées sont consultables dans le portail Stripe.
          </div>
        </div>
      </Card>
    </div>
  );
}
