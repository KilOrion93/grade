"use client";

import React, { useEffect, useState } from "react";
import { useBusinessId } from "@/components/dashboard/shell";
import { StatCard, Card, Badge, Skeleton } from "@/components/ui";
import { StarRating } from "@/components/ui/star-rating";
import { REVIEW_CRITERIA, timeAgo } from "@/lib/utils";
import {
  MessageSquare,
  Star,
  TrendingUp,
  Eye,
  EyeOff,
  Smile,
  Sparkles,
  Clock,
  Wallet,
  ChefHat,
  Store,
} from "lucide-react";

interface AnalyticsData {
  totalReviews: number;
  periodReviews: number;
  avgOverall: number;
  overallTrend: number;
  countTrend: number;
  criteriaAverages: { name: string; average: number; count: number }[];
  distribution: number[];
  publicCount: number;
  privateCount: number;
  dailyTrend: { date: string; count: number; average: number }[];
  recent: {
    id: string;
    overallScore: number;
    comment: string | null;
    visibilityType: string;
    moderationStatus: string;
    trustScore: number;
    createdAt: string;
    criteria: { name: string; score: number }[];
  }[];
}

const criterionIcons: Record<string, React.ReactNode> = {
  accueil: <Smile className="w-4 h-4" />,
  hygiene: <Sparkles className="w-4 h-4" />,
  rapidite: <Clock className="w-4 h-4" />,
  prix: <Wallet className="w-4 h-4" />,
  qualite: <ChefHat className="w-4 h-4" />,
};

export default function DashboardOverview() {
  const businessId = useBusinessId();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    fetch(`/api/analytics?businessId=${businessId}&period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [businessId, period]);

  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in text-center p-4">
        <div className="w-20 h-20 bg-[var(--color-brand-100)] text-[var(--color-brand-600)] rounded-full flex items-center justify-center mb-6">
          <Store className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Bienvenue sur le Dashboard !</h2>
        <p className="text-[var(--color-text-secondary)] max-w-md mb-8">
          Vous n'avez pas encore d'établissement enregistré. Pour commencer à collecter des avis certifiés, ajoutez votre premier business.
        </p>
        <a href="/onboarding" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-brand-600)] text-white font-medium rounded-xl hover:bg-[var(--color-brand-700)] transition-all shadow-md">
          + Ajouter mon premier établissement
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxDistribution = Math.max(...data.distribution, 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vue d&apos;ensemble</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Performance de votre établissement
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 cursor-pointer"
        >
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">3 mois</option>
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total avis"
          value={data.totalReviews}
          subtitle={`${data.periodReviews} sur la période`}
          icon={<MessageSquare className="w-5 h-5" />}
          trend={{ value: data.countTrend, label: "vs période précédente" }}
        />
        <StatCard
          title="Note moyenne"
          value={data.avgOverall > 0 ? data.avgOverall.toFixed(1) : "—"}
          subtitle="sur 5"
          icon={<Star className="w-5 h-5" />}
          trend={{ value: data.overallTrend, label: "vs période précédente" }}
        />
        <StatCard
          title="Avis publics"
          value={data.publicCount}
          subtitle={`${data.privateCount} privés`}
          icon={<Eye className="w-5 h-5" />}
        />
        <StatCard
          title="Tendance"
          value={data.overallTrend >= 0 ? "↑ Hausse" : "↓ Baisse"}
          subtitle="par rapport à la période précédente"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Criteria averages */}
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold mb-4">Moyennes par critère</h3>
          <div className="space-y-3">
            {REVIEW_CRITERIA.map((criterion) => {
              const avg =
                data.criteriaAverages.find((c) => c.name === criterion.key)
                  ?.average || 0;
              return (
                <div key={criterion.key} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
                    {criterionIcons[criterion.key]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {criterion.label}
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {avg > 0 ? avg.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--color-brand-400)] to-[var(--color-brand-600)] transition-all duration-700"
                        style={{ width: `${(avg / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Distribution */}
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold mb-4">
            Répartition des notes
          </h3>
          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = data.distribution[star - 1];
              const pct =
                data.periodReviews > 0
                  ? Math.round((count / data.periodReviews) * 100)
                  : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-3 text-right">
                    {star}
                  </span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{
                        width: `${(count / maxDistribution) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] w-10 text-right tabular-nums">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Daily trend mini-chart */}
        <Card className="lg:col-span-1">
          <h3 className="text-sm font-semibold mb-4">Activité récente</h3>
          {data.dailyTrend.length > 0 ? (
            <div className="flex items-end gap-1 h-32">
              {data.dailyTrend.slice(-14).map((day, i) => {
                const maxCount = Math.max(
                  ...data.dailyTrend.slice(-14).map((d) => d.count),
                  1
                );
                const height = (day.count / maxCount) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 group relative"
                    title={`${day.date}: ${day.count} avis, moy. ${day.average}`}
                  >
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-[var(--color-brand-500)] to-[var(--color-brand-400)] transition-all duration-300 hover:from-[var(--color-brand-600)] hover:to-[var(--color-brand-500)] min-h-[4px]"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-[var(--color-text-muted)]">
              Aucune donnée sur cette période
            </div>
          )}
        </Card>
      </div>

      {/* Recent reviews */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Derniers avis</h3>
          <a
            href="/dashboard/reviews"
            className="text-xs text-[var(--color-brand-600)] font-medium hover:underline"
          >
            Voir tout →
          </a>
        </div>
        {data.recent.length > 0 ? (
          <div className="space-y-3">
            {data.recent.map((review) => (
              <div
                key={review.id}
                className="flex items-start gap-4 p-3 rounded-xl bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-muted)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating
                      value={review.overallScore}
                      readonly
                      size="sm"
                    />
                    <Badge
                      variant={
                        review.moderationStatus === "PUBLISHED"
                          ? "success"
                          : review.moderationStatus === "FLAGGED"
                            ? "danger"
                            : "default"
                      }
                    >
                      {review.moderationStatus.toLowerCase()}
                    </Badge>
                    {review.visibilityType === "PRIVATE" && (
                      <EyeOff className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
                      {review.comment}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {timeAgo(review.createdAt)} · Confiance : {review.trustScore}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
            Aucun avis sur cette période
          </div>
        )}
      </Card>
    </div>
  );
}
