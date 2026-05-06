"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Input, Card } from "@/components/ui";
import { createBusinessAction } from "@/actions/business";
import { Store, ArrowRight, ImagePlus, X, CheckCircle2, ChevronRight } from "lucide-react";

// ─── Step 1: Business info ───────────────────────────────────────────────────

function Step1({ onSuccess }: { onSuccess: (businessId: string) => void }) {
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
    if (res.success && res.businessId) {
      onSuccess(res.businessId);
    } else {
      setError(res.error || "Une erreur est survenue");
      setIsLoading(false);
    }
  };

  return (
    <>
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
            Continuer
            <ArrowRight className="w-5 h-5" />
          </Button>
        </form>
      </Card>
    </>
  );
}

// ─── Step 2: Logo + photos ───────────────────────────────────────────────────

function Step2({ businessId, onDone }: { businessId: string; onDone: () => void }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [photosUploading, setPhotosUploading] = useState(false);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (!files.length) return;
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

  return (
    <>
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white shadow-xl mb-4">
          <ImagePlus className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold">Photos &amp; Logo</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">Ajoutez un logo et des photos pour attirer vos clients. Vous pourrez les modifier à tout moment.</p>
      </div>

      <Card className="shadow-2xl border-[var(--color-border)] animate-fade-in p-6 space-y-8">

        {/* Logo */}
        <div className="space-y-3">
          <h3 className="font-bold text-base">Logo</h3>
          <div className="flex items-center gap-5">
            {logoUrl ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[var(--color-border)] shrink-0 relative">
                <Image src={logoUrl} alt="Logo" fill className="object-cover" sizes="80px" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[var(--color-brand-50)] border border-[var(--color-brand-200)] shrink-0 flex items-center justify-center">
                <ImagePlus className="w-7 h-7 text-[var(--color-brand-400)]" />
              </div>
            )}
            <div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <Button type="button" isLoading={logoUploading} onClick={() => logoInputRef.current?.click()}>
                <ImagePlus className="w-4 h-4" />
                {logoUrl ? "Changer le logo" : "Ajouter un logo"}
              </Button>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">JPG, PNG ou WebP · max 2 Mo</p>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="space-y-3">
          <h3 className="font-bold text-base">Photos <span className="text-[var(--color-text-muted)] font-normal text-sm">({photos.length}/6)</span></h3>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={photo.id} className="aspect-video relative overflow-hidden rounded-xl border border-[var(--color-border)] group">
                  <Image src={photo.url} alt={`Photo ${index + 1}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 200px" />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-white/90 hover:bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5 text-red-600" />
                  </button>
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
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                JPG, PNG ou WebP · max 4 Mo par photo · {6 - photos.length} emplacement{6 - photos.length > 1 ? "s" : ""} restant{6 - photos.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="button" className="flex-1 py-5 text-base shadow-md" onClick={onDone}>
            {(logoUrl || photos.length > 0) && <CheckCircle2 className="w-4 h-4" />}
            Terminer
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!logoUrl && photos.length === 0 && (
            <Button type="button" variant="ghost" className="px-5" onClick={onDone}>
              Passer
            </Button>
          )}
        </div>
      </Card>
    </>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const handleStep1Success = (id: string) => {
    setBusinessId(id);
    setStep(2);
  };

  const handleDone = () => {
    router.push("/dashboard/billing");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-subtle)] p-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-brand-200)] rounded-full mix-blend-multiply blur-3xl opacity-30" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-30" />
      </div>

      {/* Step indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 1 ? 'bg-[var(--color-brand-600)]' : 'bg-[var(--color-brand-300)]'}`} />
        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${step === 2 ? 'bg-[var(--color-brand-600)]' : 'bg-[var(--color-border)]'}`} />
      </div>

      <div className="w-full max-w-lg relative z-10 py-16">
        {step === 1 && <Step1 onSuccess={handleStep1Success} />}
        {step === 2 && businessId && <Step2 businessId={businessId} onDone={handleDone} />}
      </div>
    </div>
  );
}
