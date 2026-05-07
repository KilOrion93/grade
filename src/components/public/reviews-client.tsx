"use client";

import { useMemo, useState } from "react";
import { Star, CheckCircle2, Quote, MessageSquare } from "lucide-react";

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

type SortKey = "recent" | "highest" | "lowest";

export default function ReviewsClient({ reviews, businessName }: Props) {
  const [filter, setFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");

  const starCounts = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => Math.round(r.overallScore) === star).length,
      })),
    [reviews],
  );

  const filtered = useMemo(() => {
    const base = filter === null ? reviews : reviews.filter((r) => Math.round(r.overallScore) === filter);
    const sorted = [...base];
    if (sort === "recent") sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sort === "highest") sorted.sort((a, b) => b.overallScore - a.overallScore);
    if (sort === "lowest") sorted.sort((a, b) => a.overallScore - b.overallScore);
    return sorted;
  }, [reviews, filter, sort]);

  return (
    <div className="space-y-5" aria-label={`Avis pour ${businessName}`}>
      {/* Filter + sort bar */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 flex-1 min-w-0">
          <button
            onClick={() => setFilter(null)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === null
                ? "bg-[var(--color-text)] text-white"
                : "bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-300)]"
            }`}
          >
            Tous <span className="opacity-70 font-medium ml-1">{reviews.length}</span>
          </button>
          {starCounts.filter((s) => s.count > 0).map(({ star, count }) => (
            <button
              key={star}
              onClick={() => setFilter(filter === star ? null : star)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 ${
                filter === star
                  ? "bg-[var(--color-text)] text-white border-[var(--color-text)]"
                  : "bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-300)]"
              }`}
            >
              {star}<Star className="w-3 h-3 fill-current" />
              <span className={`ml-0.5 font-medium ${filter === star ? "opacity-80" : "text-[var(--color-text-muted)]"}`}>{count}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto shrink-0">
          <label className="sr-only" htmlFor="review-sort">Trier les avis</label>
          <select
            id="review-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-xs font-semibold border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 bg-white hover:border-[var(--color-brand-300)] cursor-pointer transition-colors"
          >
            <option value="recent">Plus récents</option>
            <option value="highest">Mieux notés</option>
            <option value="lowest">Moins bien notés</option>
          </select>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((rev) => (
            <article
              key={rev.id}
              className="p-6 rounded-2xl bg-white border border-[var(--color-border)] shadow-sm hover:shadow-md hover:border-[var(--color-border-hover)] transition-all self-start"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <span className="text-lg font-black tabular-nums">{rev.overallScore}</span>
                  <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 justify-end bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Achat vérifié
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 font-medium">
                    {new Date(rev.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              {rev.comment && (
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed italic border-l-4 border-[var(--color-brand-100)] pl-4 mb-4">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              )}

              {rev.criterionScores.length > 0 && (
                <div className="pt-4 border-t border-[var(--color-border)] grid grid-cols-2 gap-x-4 gap-y-2">
                  {rev.criterionScores.map((c) => (
                    <div key={c.id} className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-[var(--color-text-muted)]">{c.criterionName}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold tabular-nums">{c.score}</span>
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {rev.response && (
                <div className="mt-4 ml-4 pl-4 border-l-2 border-[var(--color-brand-200)] bg-[var(--color-brand-50)]/40 rounded-r-xl py-3 pr-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-brand-100)] text-[var(--color-brand-700)] text-[10px] font-bold">
                      <MessageSquare className="w-3 h-3" />
                      Réponse du commerçant
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{rev.response.content}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
