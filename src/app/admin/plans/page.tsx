"use client";

import React, { useEffect, useState } from "react";
import { Card, Skeleton, Button, Input, Modal } from "@/components/ui";
import { CreditCard, Check, Edit2, Shield, Zap, BarChart3, Globe, Headphones, Smartphone, Plus, Trash2, AlertTriangle } from "lucide-react";

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

const EMPTY_FORM = {
  name: "",
  price: "",
  stripePriceId: "",
  maxBusinesses: -1,
  maxTokensPerMonth: -1,
  hasAiSummary: false,
  hasAnalytics: false,
  hasPosIntegration: false,
  hasDedicatedApi: false,
  hasPrioritySupport: false,
};

const FEATURE_OPTIONS = [
  { id: "hasAnalytics", label: "Analytics Avancés", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "hasAiSummary", label: "Résumé par IA", icon: <Zap className="w-4 h-4" /> },
  { id: "hasPosIntegration", label: "Intégration POS", icon: <Smartphone className="w-4 h-4" /> },
  { id: "hasDedicatedApi", label: "API dédiée", icon: <Globe className="w-4 h-4" /> },
  { id: "hasPrioritySupport", label: "Support Prioritaire", icon: <Headphones className="w-4 h-4" /> },
];

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"edit" | "create" | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((data) => { setPlans(data.plans || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setModalMode("create");
  };

  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setFormData({
      name: p.name,
      price: p.price.toString(),
      stripePriceId: p.stripePriceId || "",
      maxBusinesses: p.maxBusinesses,
      maxTokensPerMonth: p.maxTokensPerMonth,
      hasAiSummary: p.hasAiSummary,
      hasAnalytics: p.hasAnalytics,
      hasPosIntegration: p.hasPosIntegration,
      hasDedicatedApi: p.hasDedicatedApi,
      hasPrioritySupport: p.hasPrioritySupport,
    });
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => { setModalMode(null); setEditingPlan(null); setFormError(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...(modalMode === "edit" && editingPlan ? { id: editingPlan.id } : {}),
        ...formData,
        price: parseFloat(formData.price),
      };
      const res = await fetch("/api/admin/plans", {
        method: modalMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.plan) {
        setFormError(data.error || "Erreur lors de la sauvegarde");
        return;
      }
      if (modalMode === "edit") {
        setPlans(plans.map((p) => (p.id === data.plan.id ? data.plan : p)));
      } else {
        setPlans([...plans, data.plan].sort((a, b) => a.price - b.price));
      }
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/plans?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      setPlans(plans.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offres SaaS (Pricing)</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Gérez les plans tarifaires et les limites associées de la plateforme.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Nouveau plan
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const isHighlighted = plans.length > 1 && index === Math.floor(plans.length / 2);
          return (
            <Card
              key={plan.id}
              className={`group flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                isHighlighted
                  ? "border-[var(--color-brand-500)] ring-1 ring-[var(--color-brand-500)] relative shadow-xl"
                  : "hover:border-[var(--color-border-hover)]"
              }`}
            >
              {isHighlighted && (
                <div className="absolute top-0 right-0">
                  <div className="bg-[var(--color-brand-500)] text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg">
                    Recommandé
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[var(--color-text)]">{plan.name}</h3>
                    {plan.stripePriceId ? (
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full truncate max-w-[120px]" title={plan.stripePriceId}>
                        {plan.stripePriceId.slice(0, 16)}…
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                        Pas de Stripe ID
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-black text-[var(--color-text)]">{plan.price}€</span>
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">/mois</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-muted)]/50 border border-[var(--color-border)]/50">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Limites</p>
                      <p className="text-sm font-semibold">
                        {plan.maxBusinesses === -1 ? "Businesses illimités" : `${plan.maxBusinesses} business(es)`}
                        {" · "}
                        {plan.maxTokensPerMonth === -1 ? "Tokens illimités" : `${plan.maxTokensPerMonth} tokens/mois`}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 px-1">
                    {FEATURE_OPTIONS.map(({ id, label }) => {
                      const enabled = (plan as unknown as Record<string, unknown>)[id] as boolean;
                      return (
                        <li key={id} className="flex items-center gap-3 text-sm">
                          {enabled
                            ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            : <div className="w-4 h-4 border border-[var(--color-border)] rounded-full shrink-0" />}
                          <span className={!enabled ? "text-[var(--color-text-muted)] line-through" : ""}>{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div className="pt-6 flex gap-2">
                <Button variant="outline" className="flex-1 flex items-center justify-center gap-2" onClick={() => openEdit(plan)}>
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 hover:text-red-700 px-3"
                  onClick={() => setDeleteTarget(plan)}
                  title="Supprimer ce plan"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}

        {plans.length === 0 && (
          <div className="xl:col-span-3 text-center py-16 text-[var(--color-text-muted)]">
            <p className="text-lg font-medium mb-4">Aucun plan configuré</p>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Créer le premier plan
            </Button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={!!modalMode}
        onClose={closeModal}
        title={modalMode === "edit" ? `Modifier : ${editingPlan?.name}` : "Créer un nouveau plan"}
        size="2xl"
      >
        <form onSubmit={handleSave} className="space-y-8">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                placeholder="Ex: Pro, Premium, Business..."
              />
              <Input
                label="Prix mensuel (€)"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
              <Input
                label="Stripe Price ID"
                value={formData.stripePriceId}
                onChange={e => setFormData({ ...formData, stripePriceId: e.target.value })}
                placeholder="price_..."
                subtitle="Requis pour activer le checkout Stripe sur ce plan"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nb. Businesses"
                  type="number"
                  required
                  value={formData.maxBusinesses}
                  onChange={e => setFormData({ ...formData, maxBusinesses: parseInt(e.target.value) })}
                  subtitle="-1 = illimité"
                />
                <Input
                  label="Tokens / Mois"
                  type="number"
                  required
                  value={formData.maxTokensPerMonth}
                  onChange={e => setFormData({ ...formData, maxTokensPerMonth: parseInt(e.target.value) })}
                  subtitle="-1 = illimité"
                />
              </div>
            </div>

            <div className="space-y-6 bg-[var(--color-bg-muted)]/30 p-6 rounded-2xl border border-[var(--color-border)]/50">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-lg">Fonctionnalités incluses</h3>
              </div>
              <div className="space-y-3">
                {FEATURE_OPTIONS.map((option) => (
                  <label key={option.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-brand-500)] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--color-bg-muted)] rounded-lg">{option.icon}</div>
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]"
                      checked={(formData as unknown as Record<string, unknown>)[option.id] as boolean}
                      onChange={e => setFormData({ ...formData, [option.id]: e.target.checked })}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
            <Button type="button" variant="outline" onClick={closeModal}>Annuler</Button>
            <Button type="submit" isLoading={isSaving} className="min-w-[160px]">
              {modalMode === "edit" ? "Enregistrer les modifications" : "Créer le plan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer ce plan ?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Suppression irréversible</p>
              <p className="text-sm text-red-700 mt-1">
                Le plan <strong>{deleteTarget?.name}</strong> sera supprimé définitivement.
                Cette action est bloquée si des abonnements actifs utilisent ce plan.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              isLoading={isDeleting}
              onClick={handleDelete}
            >
              Supprimer définitivement
            </Button>
          </div>
        </div>
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
              Le <strong>Stripe Price ID</strong> est requis pour activer le checkout sur un plan.
              Créez le prix dans le dashboard Stripe, copiez l&apos;ID (<code>price_...</code>) et collez-le ici.
              La suppression d&apos;un plan est bloquée si des abonnements actifs l&apos;utilisent.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
