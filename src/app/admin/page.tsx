"use client";

import React, { useEffect, useState } from "react";
import { StatCard, Card, Skeleton } from "@/components/ui";
import { Store, Users, MessageSquare, ShieldAlert } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    restaurants: number;
    users: number;
    reviews: number;
    flagged: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/restaurants").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/reviews?status=FLAGGED").then((r) => r.json()),
      fetch("/api/admin/reviews").then((r) => r.json()),
    ])
      .then(([restData, userData, flagData, allReviewsData]) => {
        setStats({
          restaurants: restData.restaurants?.length || 0,
          users: userData.users?.length || 0,
          reviews: allReviewsData.total || 0,
          flagged: flagData.total || 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)]">Console d'Administration</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Pilotage global de la plateforme TrustReview
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-[var(--color-border)] shadow-sm">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           Systèmes Opérationnels
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Restaurants Actifs"
          value={stats?.restaurants || 0}
          icon={<Store className="w-6 h-6 text-[var(--color-brand-600)]" />}
        />
        <StatCard
          title="Comptes Clients"
          value={stats?.users || 0}
          icon={<Users className="w-6 h-6 text-blue-500" />}
        />
        <StatCard
          title="Avis Total"
          value={stats?.reviews || 0}
          icon={<MessageSquare className="w-6 h-6 text-fuchsia-500" />}
        />
        <StatCard
          title="Alertes Fraudes"
          value={stats?.flagged || 0}
          icon={<ShieldAlert className="w-6 h-6 text-red-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-[var(--color-brand-100)] bg-gradient-to-br from-white to-[var(--color-brand-50)]/30">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-12 h-12 rounded-2xl bg-[var(--color-brand-600)] flex items-center justify-center text-white shadow-lg">
                <ShieldAlert className="w-6 h-6" />
             </div>
             <div>
                <h3 className="text-xl font-bold italic">Algorithme de Confiance (Trust Engine)</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Explication du calcul automatisé de la fraude</p>
             </div>
          </div>
          
          <div className="space-y-6 text-sm text-[var(--color-text-secondary)] leading-relaxed">
            <p>
              Chaque avis soumis passe par notre <span className="font-bold text-[var(--color-brand-700)]">moteur de notation prédictive</span>. Le score de confiance (Trust Score) actuel n'utilise pas d'IA générative pour éviter les biais, mais repose sur des heuristiques mathématiques :
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-4 rounded-xl bg-white border border-[var(--color-border)] shadow-sm">
                  <div className="font-bold text-[var(--color-text)] mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Empreinte Digitale
                  </div>
                  <p className="text-xs">Vitesse de soumission (vitesse humaine vs bot) et déduplication des adresses IP / UserAgents.</p>
               </div>
               <div className="p-4 rounded-xl bg-white border border-[var(--color-border)] shadow-sm">
                  <div className="font-bold text-[var(--color-text)] mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Analyse Sémantique
                  </div>
                  <p className="text-xs">Détection des motifs récurrents et des mots-clés typiques du spam ou des faux avis (bientôt via LLM).</p>
               </div>
               <div className="p-4 rounded-xl bg-white border border-[var(--color-border)] shadow-sm">
                  <div className="font-bold text-[var(--color-text)] mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Corrélation de Visite
                  </div>
                  <p className="text-xs">Vérification de l'intégrité du Token vis-à-vis de l'horodatage et de la période de validité.</p>
               </div>
               <div className="p-4 rounded-xl bg-white border border-[var(--color-border)] shadow-sm">
                  <div className="font-bold text-[var(--color-text)] mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Anomalies de Score
                  </div>
                  <p className="text-xs">Détection des pics de notations (bombing) non corrélés à une activité réelle documentée.</p>
               </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-8 bg-gradient-to-b from-[var(--color-bg-muted)] to-[var(--color-bg-subtle)] border-[var(--color-border)]">
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Actions de Service</h3>
            <div className="space-y-3">
              <a
                href="/admin/restaurants"
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--color-border)] hover:border-[var(--color-brand-400)] hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-[var(--color-brand-600)]" />
                  <span className="text-sm font-medium">Gestion Etablissement</span>
                </div>
                <div className="text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform">&rarr;</div>
              </a>
              <a
                href="/admin/moderation"
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--color-border)] hover:border-amber-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                  <span className="text-sm font-medium">File de Modération</span>
                </div>
                <div className="text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform">&rarr;</div>
              </a>
              <a
                href="/admin/logs"
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--color-border)] hover:border-[var(--color-brand-400)] hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-[var(--color-brand-600)]" />
                  <span className="text-sm font-medium">Logs de Sécurité</span>
                </div>
                <div className="text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform">&rarr;</div>
              </a>
            </div>
          </div>
          
          <div className="mt-8 p-4 rounded-xl bg-[var(--color-brand-50)] border border-[var(--color-brand-100)]">
             <p className="text-[10px] uppercase font-black text-[var(--color-brand-600)] tracking-widest mb-1">Status Serveur</p>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-[var(--color-brand-800)]">Toutes les API répondent</span>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
