"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card } from "@/components/ui";
import { createBusinessAction } from "@/actions/business";
import { Store, ArrowRight } from "lucide-react";

export default function NewBusinessPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !city.trim()) return;

    setIsLoading(true);
    setError("");

    const res = await createBusinessAction({ name, address, city, phone: phone || undefined, website: website || undefined, description: description || undefined });

    if (res.success) {
      router.push("/dashboard/billing");
    } else {
      setError(res.error || "Une erreur est survenue");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-subtle)] p-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-brand-200)] rounded-full mix-blend-multiply blur-3xl opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-30" />
      </div>

      <div className="w-full max-w-lg relative z-10 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow-xl mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">Votre Établissement</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">Renseignez les informations de votre établissement. Vous choisirez ensuite votre abonnement.</p>
        </div>

        <Card className="shadow-2xl border-[var(--color-border)] animate-fade-in p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Nom de l'établissement *"
              placeholder="Ex: Le Bistrot Parisien"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">Adresse complète *</label>
              <textarea
                required
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)] resize-none"
                rows={2}
                placeholder="Ex: 10 Rue de la Paix, 75002 Paris"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <Input
              label="Ville *"
              placeholder="Ex: Paris"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Téléphone"
                placeholder="Ex: 01 23 45 67 89"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
              />
              <Input
                label="Site web"
                placeholder="Ex: www.bistrot.fr"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                type="url"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Présentation <span className="text-[var(--color-text-muted)] font-normal">(optionnel)</span></label>
              <textarea
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-500)] resize-y"
                rows={3}
                placeholder="Parlez-nous de vos spécialités, de l'ambiance, de votre histoire..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--color-danger)] bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
            )}

            <Button type="submit" isLoading={isLoading} className="w-full text-base py-6 shadow-md hover:shadow-lg transition-all" size="lg">
              Continuer vers l'abonnement
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
