"use client";

import React, { useEffect, useState } from "react";
import { Card, Badge, Skeleton, EmptyState, Button } from "@/components/ui";
import { Users, ChevronDown, ChevronUp, Mail, Calendar, Store, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface RestaurantInfo {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  isActive: boolean;
  _count?: { reviews: number };
}

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  memberships: { restaurant: RestaurantInfo }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const roleBadge = (role: string) => {
    const map: Record<string, "danger" | "info" | "default"> = {
      ADMIN: "danger",
      OWNER: "info",
      MANAGER: "default",
    };
    return map[role] || "default";
  };

  const toggleExpand = (id: string) => {
    setExpandedUser(expandedUser === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {users.length} utilisateurs enregistrés
        </p>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="Aucun utilisateur"
          description="Les utilisateurs apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isExpanded = expandedUser === u.id;
            return (
              <Card key={u.id} padding="none" className="overflow-hidden">
                {/* Header row — clickable */}
                <button
                  type="button"
                  onClick={() => toggleExpand(u.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[var(--color-text)]">{u.name || u.email}</h3>
                      <Badge variant={roleBadge(u.role)}>{u.role}</Badge>
                      <Badge variant={u.isActive ? "success" : "danger"}>
                        {u.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {u.email} · Inscrit le {formatDate(u.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-muted)] hidden sm:block">
                      {u.memberships.length} établissement{u.memberships.length !== 1 ? "s" : ""}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[var(--color-text-muted)]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[var(--color-text-muted)]" />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] animate-fade-in">
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Personal Info */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Informations Personnelles</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
                              <Users className="w-4 h-4 text-[var(--color-brand-600)]" />
                            </div>
                            <div>
                              <p className="text-xs text-[var(--color-text-muted)]">Nom complet</p>
                              <p className="text-sm font-medium">{u.name || "Non renseigné"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
                              <Mail className="w-4 h-4 text-[var(--color-brand-600)]" />
                            </div>
                            <div>
                              <p className="text-xs text-[var(--color-text-muted)]">Email</p>
                              <p className="text-sm font-medium">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-[var(--color-brand-600)]" />
                            </div>
                            <div>
                              <p className="text-xs text-[var(--color-text-muted)]">Date d&apos;inscription</p>
                              <p className="text-sm font-medium">{formatDate(u.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Establishments */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Établissements rattachés</h4>
                        {u.memberships.length === 0 ? (
                          <p className="text-sm text-[var(--color-text-muted)] italic">Aucun établissement</p>
                        ) : (
                          <div className="space-y-2">
                            {u.memberships.map((m) => (
                              <div
                                key={m.restaurant.id || m.restaurant.slug}
                                className="p-3 rounded-xl bg-white border border-[var(--color-border)] space-y-1"
                              >
                                <div className="flex items-center gap-2">
                                  <Store className="w-4 h-4 text-[var(--color-brand-600)]" />
                                  <a
                                    href={`/r/${m.restaurant.slug}`}
                                    target="_blank"
                                    className="text-sm font-semibold text-[var(--color-brand-600)] hover:underline"
                                  >
                                    {m.restaurant.name}
                                  </a>
                                  <Badge variant={m.restaurant.isActive ? "success" : "danger"} className="text-[10px]">
                                    {m.restaurant.isActive ? "Actif" : "Inactif"}
                                  </Badge>
                                </div>
                                {m.restaurant.address && (
                                  <div className="flex items-start gap-1.5 text-xs text-[var(--color-text-muted)]">
                                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                    {m.restaurant.address}
                                  </div>
                                )}
                                {m.restaurant.description && (
                                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{m.restaurant.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="px-5 pb-5 flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant={u.isActive ? "outline" : "primary"}
                        onClick={async () => {
                          await fetch('/api/admin/users', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: u.id, isActive: !u.isActive })
                          });
                          setUsers(users.map(usr => usr.id === u.id ? { ...usr, isActive: !u.isActive } : usr));
                        }}
                      >
                        {u.isActive ? "Bloquer" : "Débloquer"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          if (confirm("Grave: Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?")) {
                            const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' });
                            if (res.ok) setUsers(users.filter(usr => usr.id !== u.id));
                            else alert((await res.json()).error);
                          }
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
