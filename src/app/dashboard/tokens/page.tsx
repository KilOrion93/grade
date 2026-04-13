"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useBusinessId } from "@/components/dashboard/shell";
import { Button, Card, Badge, EmptyState, Skeleton } from "@/components/ui";
import { generateTokensAction } from "@/actions/token";
import { Ticket, Copy, Check, Plus, Clock } from "lucide-react";

interface TokenItem {
  id: string;
  token: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
}

export default function TokensPage() {
  const businessId = useBusinessId();
  const [existingTokens, setExistingTokens] = useState<TokenItem[]>([]);
  const [newTokens, setNewTokens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [count, setCount] = useState(10);
  const [expiry, setExpiry] = useState(48);
  const [copiedToken, setCopiedToken] = useState("");

  const fetchTokens = useCallback(async () => {
    if (!businessId) return;
    setIsFetching(true);
    try {
      const res = await fetch(`/api/tokens?businessId=${businessId}`);
      const data = await res.json();
      setExistingTokens(data.tokens || []);
    } catch {
      // ignore
    }
    setIsFetching(false);
  }, [businessId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleGenerate = async () => {
    setIsLoading(true);
    const result = await generateTokensAction({
      businessId,
      count,
      expiresInHours: expiry,
    });

    if (result.success && result.tokens) {
      setNewTokens(result.tokens.map(t => t.token));
      // Refresh the list
      await fetchTokens();
    }
    setIsLoading(false);
  };

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(""), 2000);
  };

  const copyAll = async (tokens: string[]) => {
    await navigator.clipboard.writeText(tokens.join("\n"));
    setCopiedToken("all");
    setTimeout(() => setCopiedToken(""), 2000);
  };

  const availableTokens = existingTokens.filter(t => !t.isUsed && new Date(t.expiresAt) > new Date());
  const usedTokens = existingTokens.filter(t => t.isUsed);
  const expiredTokens = existingTokens.filter(t => !t.isUsed && new Date(t.expiresAt) <= new Date());

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Tokens de visite</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Générez des codes de visite uniques pour vos clients
        </p>
      </div>

      {/* Generator */}
      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Nombre de codes
            </label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm cursor-pointer"
            >
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} codes
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Durée de validité
            </label>
            <select
              value={expiry}
              onChange={(e) => setExpiry(Number(e.target.value))}
              className="px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm cursor-pointer"
            >
              <option value={12}>12 heures</option>
              <option value={24}>24 heures</option>
              <option value={48}>48 heures</option>
              <option value={168}>1 semaine</option>
              <option value={720}>30 jours</option>
            </select>
          </div>
          <Button onClick={handleGenerate} isLoading={isLoading}>
            <Plus className="w-4 h-4" />
            Générer
          </Button>
        </div>
      </Card>

      {/* Stats */}
      {!isFetching && existingTokens.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-emerald-600">{availableTokens.length}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Disponibles</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-[var(--color-brand-600)]">{usedTokens.length}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Utilisés</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-2xl font-bold text-[var(--color-text-muted)]">{expiredTokens.length}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Expirés</p>
          </Card>
        </div>
      )}

      {/* Newly generated tokens highlight */}
      {newTokens.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-emerald-700">
              ✅ {newTokens.length} nouveaux codes viennent d&apos;être générés
            </h3>
            <Button variant="outline" size="sm" onClick={() => copyAll(newTokens)}>
              {copiedToken === "all" ? (
                <Check className="w-4 h-4 text-[var(--color-success)]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Tout copier
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {newTokens.map((token) => (
              <button
                key={token}
                onClick={() => copyToken(token)}
                className="group flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer"
              >
                <span className="font-mono text-sm font-semibold tracking-widest">
                  {token}
                </span>
                {copiedToken === token ? (
                  <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Existing tokens from DB */}
      {isFetching ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : availableTokens.length === 0 && newTokens.length === 0 ? (
        <EmptyState
          icon={<Ticket className="w-8 h-8" />}
          title="Aucun token actif"
          description="Configurez les paramètres ci-dessus et cliquez sur Générer."
        />
      ) : availableTokens.length > 0 ? (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">
              {availableTokens.length} tokens actifs
            </h3>
            <Button variant="outline" size="sm" onClick={() => copyAll(availableTokens.map(t => t.token))}>
              {copiedToken === "all" ? (
                <Check className="w-4 h-4 text-[var(--color-success)]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Tout copier
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {availableTokens.map((t) => (
              <button
                key={t.id}
                onClick={() => copyToken(t.token)}
                className="group flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border)] transition-all cursor-pointer"
              >
                <span className="font-mono text-sm font-semibold tracking-widest">
                  {t.token}
                </span>
                {copiedToken === t.token ? (
                  <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Info */}
      <Card className="bg-[var(--color-brand-50)] border-[var(--color-brand-200)]">
        <div className="flex gap-3">
          <Ticket className="w-5 h-5 text-[var(--color-brand-600)] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-[var(--color-brand-700)]">
              Comment utiliser les tokens ?
            </p>
            <p className="text-[var(--color-brand-600)] mt-1">
              Imprimez ces Tokens sur vos reçus ou distribuez-les à
              vos clients. Chaque Token ne peut être utilisé qu&apos;une seule
              fois pour garantir l&apos;authenticité des avis.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
