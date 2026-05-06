"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useBusinessId } from "@/components/dashboard/shell";
import { Card, Badge, Button, EmptyState, Skeleton } from "@/components/ui";
import { StarRating } from "@/components/ui/star-rating";
import { timeAgo } from "@/lib/utils";
import {
  MessageSquare,
  Download,
  Filter,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ReviewItem {
  id: string;
  overallScore: number;
  comment: string | null;
  visibilityType: string;
  moderationStatus: string;
  trustScore: number;
  createdAt: string;
  criteria: { name: string; score: number }[];
  response: { id: string; content: string } | null;
}

function ResponseSection({
  reviewId,
  initialResponse,
}: {
  reviewId: string;
  initialResponse: { id: string; content: string } | null;
}) {
  const [response, setResponse] = React.useState(initialResponse);
  const [editing, setEditing] = React.useState(false);
  const [content, setContent] = React.useState(initialResponse?.content ?? "");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/reviews/${reviewId}/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const data = await res.json();
      setResponse(data.response);
      setEditing(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    await fetch(`/api/reviews/${reviewId}/response`, { method: "DELETE" });
    setResponse(null);
    setContent("");
    setEditing(false);
    setSaving(false);
  };

  if (!editing && response) {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
        <p className="text-xs font-semibold text-[var(--color-brand-600)] mb-1">Votre réponse</p>
        <p className="text-xs text-[var(--color-text-secondary)]">{response.content}</p>
        <button
          onClick={() => { setContent(response.content); setEditing(true); }}
          className="text-xs text-[var(--color-brand-600)] hover:underline mt-1"
        >
          Modifier
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-[var(--color-brand-600)] hover:underline flex items-center gap-1"
        >
          + Répondre à cet avis
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-2">
      <p className="text-xs font-semibold text-[var(--color-text)]">Votre réponse</p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Répondez à ce client..."
        maxLength={1000}
        rows={3}
        className="w-full text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-600)]/20"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="text-xs font-semibold text-white bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement..." : "Publier"}
        </button>
        <button
          onClick={() => { setEditing(false); setContent(response?.content ?? ""); }}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-3 py-1.5"
        >
          Annuler
        </button>
        {response && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="text-xs text-red-500 hover:text-red-700 ml-auto"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const businessId = useBusinessId();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");

  const fetchReviews = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const params = new URLSearchParams({
      businessId,
      page: page.toString(),
      limit: "15",
    });
    if (statusFilter) params.set("status", statusFilter);
    if (visibilityFilter) params.set("visibility", visibilityFilter);

    const res = await fetch(`/api/reviews?${params}`);
    const data = await res.json();

    setReviews(data.reviews || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [businessId, page, statusFilter, visibilityFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleExport = () => {
    window.open(`/api/export?businessId=${businessId}`, "_blank");
  };

  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "default"> = {
      PUBLISHED: "success",
      PENDING: "warning",
      FLAGGED: "danger",
      REJECTED: "default",
    };
    return map[status] || "default";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Avis</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {total} avis au total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-[var(--color-text-muted)]" />
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
          <select
            value={visibilityFilter}
            onChange={(e) => { setVisibilityFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] cursor-pointer"
          >
            <option value="">Toute visibilité</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Privé</option>
          </select>
        </div>
      </Card>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-8 h-8" />}
          title="Aucun avis"
          description="Les avis de vos clients apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} hover padding="sm">
              <div className="flex items-start gap-4 p-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StarRating value={review.overallScore} readonly size="sm" showValue />
                    <Badge variant={statusBadge(review.moderationStatus)}>
                      {review.moderationStatus.toLowerCase()}
                    </Badge>
                    {review.visibilityType === "PRIVATE" && (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <EyeOff className="w-3 h-3" /> Privé
                      </span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                      Confiance: {review.trustScore}%
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {review.comment}
                    </p>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    {review.criteria.map((c) => (
                      <span
                        key={c.name}
                        className="text-xs text-[var(--color-text-muted)]"
                      >
                        {c.name}: <strong>{c.score}</strong>/5
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)]">
                    {timeAgo(review.createdAt)}
                  </p>

                  <ResponseSection reviewId={review.id} initialResponse={review.response} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-[var(--color-text-muted)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
