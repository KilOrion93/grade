"use client";

import { useState } from "react";
import { Star, CheckCircle2, Quote } from "lucide-react";

interface CriterionScore {
  id: string;
  criterionName: string;
  score: number;
}

interface ReviewResponse {
  content: string;
}

interface Review {
  id: string;
  overallScore: number;
  comment: string | null;
  createdAt: string;
  criterionScores: CriterionScore[];
  response: ReviewResponse | null;
}

interface Props {
  reviews: Review[];
  businessName: string;
}

export default function ReviewsClient({ reviews, businessName }: Props) {
  const [filter, setFilter] = useState<number | null>(null);

  const starCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.overallScore) === star).length,
  }));

  const filtered = filter === null
    ? reviews
    : reviews.filter(r => Math.round(r.overallScore) === filter);

  return (
    <div className="space-y-5">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            filter === null
              ? "bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]"
              : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-300)]"
          }`}
        >
          Tous ({reviews.length})
        </button>
        {starCounts.filter(s => s.count > 0).map(({ star, count }) => (
          <button
            key={star}
            onClick={() => setFilter(filter === star ? null : star)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filter === star
                ? "bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]"
                : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-300)]"
            }`}
          >
            {star}★ ({count})
          </button>
        ))}
      </div>

      {/* Review grid */}
      {filtered.length === 0 ? (
        <div className="p-10 rounded-[2rem] bg-white border border-[var(--color-border)] text-center">
          <div className="w-14 h-14 bg-[var(--color-bg-muted)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[var(--color-border)]">
            <Quote className="w-5 h-5 text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-lg font-bold mb-1">Aucun avis pour ce filtre</h3>
          <p className="text-[var(--color-text-secondary)] text-sm">Essayez un autre filtre ou supprimez-le.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {filtered.map(rev => (
            <div key={rev.id} className="p-6 rounded-[2rem] bg-white border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-200">
                  <span className="text-lg font-black">{rev.overallScore}</span>
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" /> Achat Vérifié
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {new Date(rev.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              {rev.comment && (
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic border-l-4 border-[var(--color-brand-100)] pl-3 mb-4">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              )}
              {rev.criterionScores.length > 0 && (
                <div className="pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-x-4 gap-y-2">
                  {rev.criterionScores.map(c => (
                    <div key={c.id} className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-[var(--color-text-muted)]">{c.criterionName}</span>
                      <span className="text-sm font-bold">{c.score}/5</span>
                    </div>
                  ))}
                </div>
              )}
              {rev.response && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] -mx-6 -mb-6 px-6 pb-6 rounded-b-[2rem]">
                  <p className="text-xs font-bold text-[var(--color-brand-600)] mb-1">Réponse du propriétaire</p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{rev.response.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
