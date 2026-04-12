"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, Skeleton, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";

interface LogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/logs?page=${page}`);
    const data = await res.json();
    setLogs(data.logs || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionColor = (action: string) => {
    if (action.includes("create") || action.includes("register")) return "success";
    if (action.includes("flag") || action.includes("moderate")) return "warning";
    if (action.includes("login") || action.includes("logout")) return "info";
    return "default";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Journal d&apos;audit</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Historique des actions sur la plateforme
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="w-8 h-8" />}
          title="Aucun log"
          description="Les actions seront enregistrées ici."
        />
      ) : (
        <Card padding="none">
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-bg-subtle)] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={actionColor(log.action) as "success" | "warning" | "info" | "default"}>
                      {log.action}
                    </Badge>
                    <span className="text-sm text-[var(--color-text-secondary)]">{log.entity}</span>
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">{log.entityId.slice(0, 12)}...</span>
                  </div>
                  {log.user && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      par {log.user.name || log.user.email}
                    </p>
                  )}
                </div>
                <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
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
