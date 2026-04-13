"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, Skeleton, EmptyState } from "@/components/ui";
import { StarRating } from "@/components/ui/star-rating";
import { timeAgo } from "@/lib/utils";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

interface ReviewItem {
  id: string;
  overallScore: number;
  comment: string | null;
  visibilityType: string;
  moderationStatus: string;
  trustScore: number;
  createdAt: string;
  businessName: string;
  flagCount: number;
  flagReasons: string[];
  criteria: { name: string; score: number }[];
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString() });
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/admin/reviews?${params}`);
    const data = await res.json();
    setReviews(data.reviews || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleModerate = async (id: string, moderationStatus: string) => {
    await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, moderationStatus }),
    });
    fetchReviews();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "default"> = {
      PUBLISHED: "success", PENDING: "warning", FLAGGED: "danger", REJECTED: "default",
    };
    return map[s] || "default";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Modération</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          En tant qu'Admin Plateforme, vous seul avez le pouvoir de rejeter un avis s'il est signalé ou frauduleux.
        </p>
      </div>

      <Card padding="sm">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer"
          >
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="PUBLISHED">Publié</option>
            <option value="FLAGGED">Signalé</option>
            <option value="REJECTED">Rejeté</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-8 h-8" />}
          title="Aucun avis à modérer"
          description="Les avis soumis apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} padding="sm" className={review.moderationStatus === 'FLAGGED' ? 'border-red-300 bg-red-50' : ''}>
              <div className="p-2 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{review.businessName}</span>
                      <StarRating value={review.overallScore} readonly size="sm" />
                      <Badge variant={statusBadge(review.moderationStatus)}>
                        {review.moderationStatus}
                      </Badge>
                      {review.flagCount > 0 && (
                        <Badge variant="danger">{review.flagCount} signalement{review.flagCount > 1 ? "s" : ""}</Badge>
                      )}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-[var(--color-text-secondary)]">{review.comment}</p>
                    )}
                    {review.flagReasons && review.flagReasons.length > 0 && (
                      <div className="mt-2 text-xs bg-white/60 p-2 rounded border border-red-100">
                        <span className="font-semibold text-red-700">Motif(s) du signalement :</span>
                        <ul className="list-disc pl-4 text-red-600 mt-1">
                          {review.flagReasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {timeAgo(review.createdAt)} · Confiance: {review.trustScore}%
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {review.moderationStatus !== "PUBLISHED" && (
                      <Button size="sm" variant="outline" onClick={() => handleModerate(review.id, "PUBLISHED")}>
                        Forcer la parution
                      </Button>
                    )}
                    {(review.moderationStatus === "PENDING" || review.moderationStatus === "FLAGGED") && (
                      <Button size="sm" variant="danger" onClick={() => handleModerate(review.id, "REJECTED")}>
                        Rejeter / Bloquer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-[var(--color-text-muted)]">{page} / {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
