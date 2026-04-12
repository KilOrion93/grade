"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { createRestaurantAction } from "@/actions/restaurant";
import { Store, ArrowRight } from "lucide-react";

export default function NewRestaurantPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setIsLoading(true);
    setError("");

    const res = await createRestaurantAction({ name, address, description });
    
    if (res.success) {
      window.location.href = "/dashboard";
    } else {
      setError(res.error || "Une erreur est survenue");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-subtle)] p-4 relative">
      {/* Background Decorators */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-brand-200)] rounded-full mix-blend-multiply blur-3xl opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-30" />
      </div>

      <div className="w-full max-w-lg relative z-10 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow-xl mb-4">
             <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">Nouvel Établissement</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">Ajoutez votre établissement à l'annuaire TrustReview pour commencer à collecter des avis certifiés.</p>
        </div>

        <Card className="shadow-2xl border-[var(--color-border)] animate-fade-in p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Nom de l'établissement"
              placeholder="Ex: Le Bistrot Parisien"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="text-lg py-3"
            />
            
            <div className="space-y-1">
              <label className="text-sm font-medium">Adresse Complète</label>
              <textarea
                required
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)] resize-none"
                rows={2}
                placeholder="Ex: 10 Rue de la Paix, 75002 Paris"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium">Présentez votre établissement <span className="text-[var(--color-text-muted)] font-normal">(Optionnel)</span></label>
              <textarea
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)] resize-y"
                rows={4}
                placeholder="Parlez-nous de vos spécialités, de l'ambiance, de votre histoire..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Ceci sera affiché sur votre vitrine publique pour attirer les clients.</p>
            </div>
            
            {error && (
              <p className="text-sm text-[var(--color-danger)] bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full text-base py-6 shadow-md hover:shadow-lg transition-all" size="lg">
              Ajouter à l'annuaire
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
