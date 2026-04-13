"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, Skeleton, EmptyState, Button, Input, Textarea } from "@/components/ui";
import { Store, Edit2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Business {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { reviews: number; visitTokens: number };
  memberships: { user: { email: string; name: string | null } }[];
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/businesses")
      .then((response) => response.json())
      .then((data) => {
        setBusinesses(data.businesses || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          address: newAddress,
          description: newDescription,
        }),
      });
      const data = await response.json();

      if (data.business) {
        setBusinesses([
          { ...data.business, _count: { reviews: 0, visitTokens: 0 }, memberships: [] },
          ...businesses,
        ]);
        setNewName("");
        setNewAddress("");
        setNewDescription("");
        setShowCreateForm(false);
      } else {
        alert(data.error);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (business: Business) => {
    setEditingBusiness(business);
    setEditName(business.name);
    setEditAddress(business.address || "");
    setEditDescription(business.description || "");
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingBusiness) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBusiness.id,
          name: editName,
          address: editAddress,
          description: editDescription,
        }),
      });
      const data = await response.json();

      if (data.business) {
        setBusinesses(
          businesses.map((business) =>
            business.id === editingBusiness.id ? { ...business, ...data.business } : business,
          ),
        );
        setEditingBusiness(null);
      } else {
        alert(data.error);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Businesses</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {businesses.length} businesses enregistrés
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} variant={showCreateForm ? "outline" : "primary"}>
          {showCreateForm ? "Annuler" : "Ajouter un business"}
        </Button>
      </div>

      {showCreateForm && (
        <Card padding="md" className="border-[var(--color-brand-200)] bg-[var(--color-brand-50)]">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-semibold text-[var(--color-brand-800)]">Création manuelle d'un business</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nom" required value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nom du business" />
              <Input label="Adresse" required value={newAddress} onChange={(event) => setNewAddress(event.target.value)} placeholder="10 Rue de la Paix" />
            </div>
            <Textarea label="Description publique" value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Présentation..." rows={3} />
            <Button type="submit" isLoading={isCreating}>Confirmer la création</Button>
          </form>
        </Card>
      )}

      {editingBusiness && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-xl font-bold">Éditer : {editingBusiness.name}</h2>
              <button onClick={() => setEditingBusiness(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nouveau nom" required value={editName} onChange={(event) => setEditName(event.target.value)} />
                <Input label="Nouvelle adresse" required value={editAddress} onChange={(event) => setEditAddress(event.target.value)} />
              </div>
              <Textarea label="Nouvelle description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={3} />
              <div className="pt-4 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditingBusiness(null)}>Annuler</Button>
                <Button type="submit" isLoading={isUpdating}>Sauvegarder</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {businesses.length === 0 ? (
        <EmptyState
          icon={<Store className="w-8 h-8" />}
          title="Aucun business"
          description="Les businesses apparaîtront ici après leur inscription."
        />
      ) : (
        <div className="space-y-3">
          {businesses.map((business) => (
            <Card key={business.id} hover padding="sm">
              <div className="flex items-center justify-between p-2 flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/r/${business.slug}`} target="_blank" className="font-semibold hover:underline text-[var(--color-brand-600)] text-lg">
                      {business.name}
                    </Link>
                    <Badge variant={business.isActive ? "success" : "danger"}>
                      {business.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] italic">
                    {business.address || "Aucune adresse renseignée"}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    /{business.slug} · {business._count?.reviews || 0} avis · Créé le {formatDate(business.createdAt)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Responsables : {business.memberships.length ? business.memberships.map((membership) => membership.user.email).join(", ") : "Aucun responsable"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(business)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Modifier
                    </Button>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant={business.isActive ? "secondary" : "primary"}
                      onClick={async () => {
                        await fetch("/api/admin/businesses", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: business.id, isActive: !business.isActive }),
                        });
                        setBusinesses(
                          businesses.map((item) =>
                            item.id === business.id ? { ...item, isActive: !business.isActive } : item,
                          ),
                        );
                      }}
                    >
                      {business.isActive ? "Bloquer" : "Débloquer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        if (confirm("Êtes-vous sûr de vouloir supprimer définitivement ce business et ses avis ?")) {
                          await fetch(`/api/admin/businesses?id=${business.id}`, { method: "DELETE" });
                          setBusinesses(businesses.filter((item) => item.id !== business.id));
                        }
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
