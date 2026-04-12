"use client";

import React, { useState } from "react";
import { Button, Input, Card } from "@/components/ui";
import { loginAction, registerAction } from "@/actions/auth";
import { ShieldCheck, Mail, Lock, User, Store } from "lucide-react";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      const result = isRegister
        ? await registerAction(formData)
        : await loginAction(formData);

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch {
      // redirect throws, which is expected
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white mb-4 shadow-lg">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">TrustReview</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {isRegister
              ? "Créez votre compte restaurateur"
              : "Connectez-vous à votre espace"}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <Input
                  label="Votre nom"
                  name="name"
                  placeholder="Jean Dupont"
                  required
                  icon={<User className="w-4 h-4" />}
                />
                <Input
                  label="Nom du restaurant"
                  name="restaurantName"
                  placeholder="Le Bistrot Parisien"
                  required
                  icon={<Store className="w-4 h-4" />}
                />
              </>
            )}

            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="vous@restaurant.com"
              required
              icon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Mot de passe"
              name="password"
              type="password"
              placeholder={isRegister ? "Min. 8 caractères" : "••••••••"}
              required
              icon={<Lock className="w-4 h-4" />}
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              {isRegister ? "Créer mon compte" : "Se connecter"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] font-medium transition-colors cursor-pointer"
            >
              {isRegister
                ? "Déjà un compte ? Se connecter"
                : "Pas de compte ? S'inscrire"}
            </button>
          </div>
        </Card>
      </div>
    </main>
  );
}
