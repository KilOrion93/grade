"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Card, Button, Input, Textarea, Skeleton } from "@/components/ui";
import { useBusinessId } from "@/components/dashboard/shell";
import { Building2, User, Save, CheckCircle2, ImagePlus, ChevronUp, ChevronDown, X } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  order: number;
}

interface BusinessData {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  photos: Photo[];
}

interface UserData {
  id: string;
  name: string | null;
  email: string;
}

export default function SettingsPage() {
  const businessId = useBusinessId();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosUploading, setPhotosUploading] = useState(false);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessSaved, setBusinessSaved] = useState(false);

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
        setLogoUrl(r.logoUrl || null);
        setPhotos(r.photos || []);
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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/logo", {
        method: "POST",
        headers: { "x-business-id": businessId },
        body: formData,
      });
      const data = await res.json();
      if (data.url) setLogoUrl(data.url);
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !businessId) return;
    setPhotosUploading(true);
    try {
      const formData = new FormData();
      files.slice(0, 6 - photos.length).forEach(f => formData.append("files", f));
      const res = await fetch("/api/upload/photos", {
        method: "POST",
        headers: { "x-business-id": businessId },
        body: formData,
      });
      const data = await res.json();
      if (data.photos) setPhotos(prev => [...prev, ...data.photos]);
    } finally {
      setPhotosUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    await fetch(`/api/business/photos?id=${photoId}`, { method: "DELETE" });
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const movePhoto = async (index: number, direction: "up" | "down") => {
    const newPhotos = [...photos];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newPhotos.length) return;
    [newPhotos[index], newPhotos[swapIndex]] = [newPhotos[swapIndex], newPhotos[index]];
    setPhotos(newPhotos);
    await fetch("/api/business/photos/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, photoIds: newPhotos.map(p => p.id) }),
    });
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

      {/* Logo section */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Logo</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Image principale de votre établissement</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {logoUrl ? (
              <div className="w-20 h-20 rounded-xl overflow-hidden border border-[var(--color-border)] flex-shrink-0">
                <Image src={logoUrl} alt="Logo" width={80} height={80} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl bg-[var(--color-brand-50)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-[var(--color-brand-600)]">
                  {businessName ? businessName.charAt(0).toUpperCase() : "?"}
                </span>
              </div>
            )}
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <Button type="button" isLoading={logoUploading} onClick={() => logoInputRef.current?.click()}>
                <ImagePlus className="w-4 h-4" />
                {logoUrl ? "Changer le logo" : "Ajouter un logo"}
              </Button>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">JPG, PNG ou WebP — max 2 Mo</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Photos gallery section */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] flex items-center justify-center">
              <ImagePlus className="w-5 h-5 text-[var(--color-brand-600)]" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Photos</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Galerie de photos ({photos.length}/6)</p>
            </div>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={photo.id} className="aspect-video relative overflow-hidden rounded-xl border border-[var(--color-border)] group">
                  <Image src={photo.url} alt={`Photo ${index + 1}`} fill className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button type="button" onClick={() => movePhoto(index, "up")} disabled={index === 0}
                      className="p-1 rounded bg-white/80 hover:bg-white disabled:opacity-30 transition-colors">
                      <ChevronUp className="w-4 h-4 text-gray-800" />
                    </button>
                    <button type="button" onClick={() => movePhoto(index, "down")} disabled={index === photos.length - 1}
                      className="p-1 rounded bg-white/80 hover:bg-white disabled:opacity-30 transition-colors">
                      <ChevronDown className="w-4 h-4 text-gray-800" />
                    </button>
                    <button type="button" onClick={() => handleDeletePhoto(photo.id)}
                      className="p-1 rounded bg-white/80 hover:bg-white transition-colors">
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {photos.length < 6 && (
            <div>
              <input ref={photosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
              <Button type="button" isLoading={photosUploading} onClick={() => photosInputRef.current?.click()}>
                <ImagePlus className="w-4 h-4" />
                Ajouter des photos
              </Button>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                JPG, PNG ou WebP — max 4 Mo par photo, {6 - photos.length} emplacement{6 - photos.length > 1 ? "s" : ""} restant{6 - photos.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </Card>

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
            <Input label="Nom complet" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Votre nom" />
            <Input label="Email" value={user?.email || ""} disabled className="opacity-60" />
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
            <Input label="Nom de l'établissement" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
            <Input label="Téléphone" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} placeholder="+33 1 23 45 67 89" />
          </div>
          <Input label="Adresse complète" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="10 Rue de la Paix, 75002 Paris" required />
          <Input label="Site web" value={businessWebsite} onChange={(e) => setBusinessWebsite(e.target.value)} placeholder="https://www.mon-business.fr" />
          <Textarea label="Description" value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} rows={4} placeholder="Décrivez votre établissement, vos spécialités, votre ambiance..." />
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
