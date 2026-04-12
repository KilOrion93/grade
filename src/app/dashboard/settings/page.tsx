"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, Button, Input, Textarea, Skeleton } from "@/components/ui";
import { useRestaurantId } from "@/components/dashboard/shell";
import { Building2, User, Save, CheckCircle2 } from "lucide-react";

interface RestaurantData {
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
  const restaurantId = useRestaurantId();

  // Restaurant edit state
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [restName, setRestName] = useState("");
  const [restAddress, setRestAddress] = useState("");
  const [restDescription, setRestDescription] = useState("");
  const [restPhone, setRestPhone] = useState("");
  const [restWebsite, setRestWebsite] = useState("");
  const [restSaving, setRestSaving] = useState(false);
  const [restSaved, setRestSaved] = useState(false);

  // User edit state
  const [user, setUser] = useState<UserData | null>(null);
  const [userName, setUserName] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [userSaved, setUserSaved] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const [restRes, userRes] = await Promise.all([
        fetch(`/api/restaurant?id=${restaurantId}`),
        fetch(`/api/profile`),
      ]);
      const restData = await restRes.json();
      const userData = await userRes.json();

      if (restData.restaurant) {
        const r = restData.restaurant;
        setRestaurant(r);
        setRestName(r.name || "");
        setRestAddress(r.address || "");
        setRestDescription(r.description || "");
        setRestPhone(r.phone || "");
        setRestWebsite(r.website || "");
      }
      if (userData.user) {
        setUser(userData.user);
        setUserName(userData.user.name || "");
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestSaving(true);
    setRestSaved(false);
    try {
      const res = await fetch(`/api/restaurant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: restaurantId,
          name: restName,
          address: restAddress,
          description: restDescription,
          phone: restPhone,
          website: restWebsite,
        }),
      });
      if (res.ok) {
        setRestSaved(true);
        setTimeout(() => setRestSaved(false), 3000);
      }
    } finally {
      setRestSaving(false);
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

      {/* Restaurant section */}
      <Card>
        <form onSubmit={handleSaveRestaurant} className="space-y-5">
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
              value={restName}
              onChange={(e) => setRestName(e.target.value)}
              required
            />
            <Input
              label="Téléphone"
              value={restPhone}
              onChange={(e) => setRestPhone(e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>

          <Input
            label="Adresse complète"
            value={restAddress}
            onChange={(e) => setRestAddress(e.target.value)}
            placeholder="10 Rue de la Paix, 75002 Paris"
            required
          />

          <Input
            label="Site web"
            value={restWebsite}
            onChange={(e) => setRestWebsite(e.target.value)}
            placeholder="https://www.mon-restaurant.fr"
          />

          <Textarea
            label="Description"
            value={restDescription}
            onChange={(e) => setRestDescription(e.target.value)}
            rows={4}
            placeholder="Décrivez votre établissement, vos spécialités, votre ambiance..."
          />

          <div className="flex items-center gap-3">
            <Button type="submit" isLoading={restSaving}>
              <Save className="w-4 h-4" />
              Enregistrer l&apos;établissement
            </Button>
            {restSaved && (
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
