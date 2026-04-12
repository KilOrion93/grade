"use client";

import React, { useEffect, useState } from "react";
import { Card, Badge, Skeleton, EmptyState, Button, Input, Textarea } from "@/components/ui";
import { Store, Edit2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface Restaurant {
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

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit State
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/restaurants")
      .then((r) => r.json())
      .then((data) => {
        setRestaurants(data.restaurants || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, address: newAddress, description: newDescription })
      });
      const data = await res.json();
      if (data.restaurant) {
        setRestaurants([{...data.restaurant, _count: { reviews: 0, visitTokens: 0 }, memberships: []}, ...restaurants]);
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

  const openEdit = (r: Restaurant) => {
    setEditingRestaurant(r);
    setEditName(r.name);
    setEditAddress(r.address || "");
    setEditDescription((r as any).description || "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/restaurants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: editingRestaurant.id, 
          name: editName, 
          address: editAddress, 
          description: editDescription 
        })
      });
      const data = await res.json();
      if (data.restaurant) {
        setRestaurants(restaurants.map(r => r.id === editingRestaurant.id ? { ...r, ...data.restaurant } : r));
        setEditingRestaurant(null);
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
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Restaurants</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {restaurants.length} établissements enregistrés
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} variant={showCreateForm ? "outline" : "primary"}>
          {showCreateForm ? "Annuler" : "Ajouter un restaurant"}
        </Button>
      </div>

      {showCreateForm && (
        <Card padding="md" className="border-[var(--color-brand-200)] bg-[var(--color-brand-50)]">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-semibold text-[var(--color-brand-800)]">Création manuelle d'un restaurant</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nom" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Le Bistrot Parisien" />
              <Input label="Adresse (Obligatoire)" required value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="10 Rue de la Paix" />
            </div>
            <Textarea label="Description publique" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Présentation..." rows={3} />
            <Button type="submit" isLoading={isCreating}>Confirmer la création</Button>
          </form>
        </Card>
      )}

      {/* EDIT MODAL */}
      {editingRestaurant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-xl font-bold">Éditer: {editingRestaurant.name}</h2>
              <button onClick={() => setEditingRestaurant(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nouveau Nom" required value={editName} onChange={e => setEditName(e.target.value)} />
                <Input label="Nouvelle Adresse" required value={editAddress} onChange={e => setEditAddress(e.target.value)} />
              </div>
              <Textarea label="Nouvelle Description" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
              
              <div className="pt-4 flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditingRestaurant(null)}>Annuler</Button>
                <Button type="submit" isLoading={isUpdating}>Sauvegarder</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {restaurants.length === 0 ? (
        <EmptyState
          icon={<Store className="w-8 h-8" />}
          title="Aucun restaurant"
          description="Les restaurants apparaîtront ici après leur inscription."
        />
      ) : (
        <div className="space-y-3">
          {restaurants.map((r) => (
            <Card key={r.id} hover padding="sm">
              <div className="flex items-center justify-between p-2 flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/r/${r.slug}`} target="_blank" className="font-semibold hover:underline text-[var(--color-brand-600)] text-lg">
                      {r.name}
                    </Link>
                    <Badge variant={r.isActive ? "success" : "danger"}>
                      {r.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] italic">
                    {r.address || "Aucune adresse renseignée"}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    /{r.slug} · {r._count?.reviews || 0} avis · Créé le {formatDate(r.createdAt)}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Clients rattachés: {r.memberships?.length ? r.memberships.map((m) => m.user.email).join(", ") : "Aucun responsable"}
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(r)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Modifier
                    </Button>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant={r.isActive ? "secondary" : "primary"}
                      onClick={async () => {
                        await fetch('/api/admin/restaurants', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: r.id, isActive: !r.isActive })
                        });
                        setRestaurants(restaurants.map(rest => rest.id === r.id ? { ...rest, isActive: !r.isActive } : rest));
                      }}
                    >
                      {r.isActive ? "Bloquer" : "Débloquer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={async () => {
                        if (confirm("Grosse alerte : Êtes-vous sûr de vouloir supprimer définitivement ce restaurant et ses avis ?")) {
                          await fetch(`/api/admin/restaurants?id=${r.id}`, { method: 'DELETE' });
                          setRestaurants(restaurants.filter(rest => rest.id !== r.id));
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
