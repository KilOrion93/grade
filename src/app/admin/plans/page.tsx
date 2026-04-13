"use client";

import React, { useEffect, useState } from "react";
import { Card, Badge, Skeleton, Button, Input, Modal } from "@/components/ui";
import { CreditCard, Check, Edit2, Shield, Zap, BarChart3, Globe, Headphones, Smartphone } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  maxBusinesses: number;
  maxTokensPerMonth: number;
  hasAiSummary: boolean;
  hasAnalytics: boolean;
  hasPosIntegration: boolean;
  hasDedicatedApi: boolean;
  hasPrioritySupport: boolean;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    maxBusinesses: 0,
    maxTokensPerMonth: 0,
    hasAiSummary: false,
    hasAnalytics: false,
    hasPosIntegration: false,
    hasDedicatedApi: false,
    hasPrioritySupport: false,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setFormData({
      name: p.name,
      price: p.price.toString(),
      maxBusinesses: p.maxBusinesses,
      maxTokensPerMonth: p.maxTokensPerMonth,
      hasAiSummary: p.hasAiSummary,
      hasAnalytics: p.hasAnalytics,
      hasPosIntegration: p.hasPosIntegration,
      hasDedicatedApi: p.hasDedicatedApi,
      hasPrioritySupport: p.hasPrioritySupport,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: editingPlan.id, 
          ...formData,
          price: parseFloat(formData.price),
        })
      });
      const data = await res.json();
      if (data.plan) {
        setPlans(plans.map(p => p.id === editingPlan.id ? data.plan : p));
        setEditingPlan(null);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in relative z-10 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Offres SaaS (Pricing)</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Gérez les plans tarifaires et les limites associées de la plateforme.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const isPopular = index === 1;
          
          return (
            <Card
              key={plan.id}
              className={`group flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                isPopular
                  ? "border-[var(--color-brand-500)] ring-1 ring-[var(--color-brand-500)] relative shadow-xl transform scale-[1.02] z-10"
                  : "hover:border-[var(--color-border-hover)]"
              }`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-[var(--color-brand-500)] text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg">
                    Recommandé
                  </div>
                </div>
              )}
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-text)]">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black text-[var(--color-text)]">{plan.price}€</span>
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">/mois</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-muted)]/50 border border-[var(--color-border)]/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Limites</p>
                      <p className="text-sm font-semibold">{plan.maxBusinesses === -1 ? "Businesses illimités" : `${plan.maxBusinesses} business(es)`}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 px-1">
                    <li className="flex items-center gap-3 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{plan.maxTokensPerMonth === -1 ? "Tokens illimités" : `${plan.maxTokensPerMonth} tokens /mois`}</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm opacity-90 transition-opacity">
                      {plan.hasAnalytics ? <Check className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 border border-[var(--color-border)] rounded-full" />}
                      <span className={!plan.hasAnalytics ? "text-[var(--color-text-muted)] line-through" : ""}>Analytics avancés</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm opacity-90">
                      {plan.hasAiSummary ? <Check className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 border border-[var(--color-border)] rounded-full" />}
                      <span className={!plan.hasAiSummary ? "text-[var(--color-text-muted)] line-through" : ""}>Résumé par IA</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm opacity-90">
                      {plan.hasPosIntegration ? <Check className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 border border-[var(--color-border)] rounded-full" />}
                      <span className={!plan.hasPosIntegration ? "text-[var(--color-text-muted)] line-through" : ""}>Intégration POS</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm opacity-90">
                      {plan.hasPrioritySupport ? <Check className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 border border-[var(--color-border)] rounded-full" />}
                      <span className={!plan.hasPrioritySupport ? "text-[var(--color-text-muted)] line-through" : ""}>Support prioritaire</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-8 space-y-3">
                <Button variant={isPopular ? "primary" : "outline"} className="w-full" onClick={() => openEdit(plan)}>
                  <Edit2 className="w-4 h-4" />
                  Modifier le plan
                </Button>
                {plan.price === 0 && (
                   <div className="text-[10px] text-center font-bold text-emerald-600 uppercase tracking-widest">
                     Plan par défaut
                   </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* EDIT MODAL - PREMIUM & LARGE */}
      <Modal 
        open={!!editingPlan} 
        onClose={() => setEditingPlan(null)} 
        title={`Configuration du Plan : ${editingPlan?.name}`}
        size="2xl"
      >
        <form onSubmit={handleUpdate} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Colonne 1 : Identité & Limites */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[var(--color-brand-600)]" />
                <h3 className="font-bold text-lg">Identité & Limites</h3>
              </div>
              
              <Input 
                label="Nom de l'offre" 
                required 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Ex: Pro, Premium..."
              />
              
              <Input 
                label="Prix mensuel (€)" 
                type="number" 
                step="0.01" 
                required 
                value={formData.price} 
                onChange={e => setFormData({ ...formData, price: e.target.value })} 
              />

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Nb. Businesses" 
                  type="number" 
                  required 
                  value={formData.maxBusinesses} 
                  onChange={e => setFormData({ ...formData, maxBusinesses: parseInt(e.target.value) })} 
                  subtitle="-1 pour illimité"
                />
                <Input 
                  label="Tokens / Mois" 
                  type="number" 
                  required 
                  value={formData.maxTokensPerMonth} 
                  onChange={e => setFormData({ ...formData, maxTokensPerMonth: parseInt(e.target.value) })} 
                  subtitle="-1 pour illimité"
                />
              </div>
            </div>

            {/* Colonne 2 : Fonctionnalités */}
            <div className="space-y-6 bg-[var(--color-bg-muted)]/30 p-6 rounded-2xl border border-[var(--color-border)]/50">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-lg">Options incluses</h3>
              </div>

              <div className="space-y-4">
                {[
                  { id: "hasAnalytics", label: "Analytics Avancés", icon: <BarChart3 className="w-4 h-4" /> },
                  { id: "hasAiSummary", label: "Résumé par IA", icon: <Zap className="w-4 h-4" /> },
                  { id: "hasPosIntegration", label: "Intégration POS", icon: <Smartphone className="w-4 h-4" /> },
                  { id: "hasDedicatedApi", label: "API dédiée", icon: <Globe className="w-4 h-4" /> },
                  { id: "hasPrioritySupport", label: "Support Prioritaire", icon: <Headphones className="w-4 h-4" /> },
                ].map((option) => (
                  <label key={option.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-brand-500)] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-bg-muted)] rounded-lg">
                        {option.icon}
                      </div>
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]"
                      checked={(formData as any)[option.id]}
                      onChange={e => setFormData({ ...formData, [option.id]: e.target.checked })}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
            <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>Annuler</Button>
            <Button type="submit" isLoading={isUpdating} className="min-w-[150px]">Enregistrer les modifications</Button>
          </div>
        </form>
      </Modal>

      <Card className="bg-gradient-to-r from-[var(--color-brand-50)] to-blue-50 border-blue-200 mt-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <CreditCard className="w-32 h-32" />
        </div>
        <div className="flex gap-4 relative z-10">
          <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600">
             <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-blue-900">Intégration Stripe Billing</p>
            <p className="text-blue-700 text-sm mt-1 leading-relaxed max-w-2xl">
              Ces modifications impactent directement la facturation. L&apos;intégration avec Stripe Checkout synchronisera ces limites lors du prochain cycle de paiement des clients.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
