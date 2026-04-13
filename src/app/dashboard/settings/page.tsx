"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, Button, Input, Textarea, Skeleton } from "@/components/ui";
import { useBusinessId } from "@/components/dashboard/shell";
import { Building2, User, Save, CheckCircle2 } from "lucide-react";

interface BusinessData {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
}

export default function SettingsPage() {
  const businessId = useBusinessId();

  // Business edit state
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessSaved, setBusinessSaved] = useState(false);

  // User edit state
  const [user, setUser] = useState<UserData | null>(null);
  const [userName, setUserName] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [userSaved, setUserSaved] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    try {
      const [restRes, userRes] = await Promise.all([
        fetch(`/api/business?id=${businessId}`),
        fetch(`/api/profile`),
      ]);
      const restData = await restRes.json();
      const userData = await userRes.json();

      if (restData.business) {
        const r = restData.business;
        setBusiness(r);
        setBusinessName(r.name || "");
        setBusinessAddress(r.address || "");
        setBusinessDescription(r.description || "");
        setBusinessPhone(r.phone || "");
        setBusinessWebsite(r.website || "");
      }
      if (userData.user) {
        setUser(userData.user);
        setUserName(userData.user.name || "");
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusinessSaving(true);
    setBusinessSaved(false);
    try {
      const res = await fetch(`/api/business`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: businessId,
          name: businessName,
          address: businessAddress,
          description: businessDescription,
          phone: businessPhone,
          website: businessWebsite,
        }),
      });
      if (res.ok) {
        setBusinessSaved(true);
        setTimeout(() => setBusinessSaved(false), 3000);
      }
    } finally {
      setBusinessSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSaving(true);
    setUserSaved(false);
    try {
      const res = await fetch(`/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName }),
      });
      if (res.ok) {
        setUserSaved(true);
        setTimeout(() => setUserSaved(false), 3000);
      }
    } finally {
      setUserSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Gérez les informations de votre profil et de votre établissement
        </p>
      </div>

      {/* Profile section */}
      <Card>
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
              <User className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mon Profil</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Vos informations personnelles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom complet"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Votre nom"
            />
            <Input
              label="Email"
              value={user?.email || ""}
              disabled
              className="opacity-60"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={userSaving}>
              <Save className="w-4 h-4" />
              Enregistrer le profil
            </Button>
            {userSaved && (
              <span className="text-sm text-emerald-600 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Sauvegardé
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Business section */}
      <Card>
        <form onSubmit={handleSaveBusiness} className="space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Mon Établissement</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Informations visibles publiquement</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom de l'établissement"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
            <Input
              label="Téléphone"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <Input
            label="Adresse complète"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder="10 Rue de la Paix, 75002 Paris"
            required
          />

          <Input
            label="Site web"
            value={businessWebsite}
            onChange={(e) => setBusinessWebsite(e.target.value)}
            placeholder="https://www.mon-business.fr"
          />

          <Textarea
            label="Description"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            rows={4}
            placeholder="Décrivez votre établissement, vos spécialités, votre ambiance..."
          />

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={businessSaving}>
              <Save className="w-4 h-4" />
              Enregistrer l&apos;établissement
            </Button>
            {businessSaved && (
              <span className="text-sm text-emerald-600 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" /> Sauvegardé
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
