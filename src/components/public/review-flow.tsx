"use client";

import React, { useState } from "react";
import { validateTokenAction } from "@/actions/review";
import { submitReviewAction } from "@/actions/review";
import { Button, Input, Textarea, Card } from "@/components/ui";
import { StarRating, CriterionRating } from "@/components/ui/star-rating";
import { REVIEW_CRITERIA } from "@/lib/utils";
import {
  ShieldCheck,
  CheckCircle2,
  Smile,
  Sparkles,
  Clock,
  Wallet,
  ChefHat,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

type Step = "welcome" | "token" | "review" | "success";

const criterionIcons: Record<string, React.ReactNode> = {
  accueil: <Smile className="w-4 h-4" />,
  hygiene: <Sparkles className="w-4 h-4" />,
  rapidite: <Clock className="w-4 h-4" />,
  prix: <Wallet className="w-4 h-4" />,
  qualite: <ChefHat className="w-4 h-4" />,
};

interface Props {
  restaurantSlug: string;
  restaurantName: string;
}

export default function RestaurantReviewFlow({
  restaurantSlug,
  restaurantName,
}: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [tokenInput, setTokenInput] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Review state
  const [criteria, setCriteria] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");

  // Computed score
  const computedOverallScore = React.useMemo(() => {
    const values = Object.values(criteria);
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return parseFloat((sum / values.length).toFixed(1));
  }, [criteria]);

  const handleValidateToken = async () => {
    if (!tokenInput.trim()) {
      setError("Veuillez entrer votre code de visite");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await validateTokenAction(tokenInput, restaurantSlug);

    if (result.valid && result.tokenId && result.restaurantId) {
      setTokenId(result.tokenId);
      setRestaurantId(result.restaurantId);
      setStep("review");
    } else {
      setError(result.error || "Code invalide");
    }

    setIsLoading(false);
  };

  const handleSubmitReview = async () => {
    const criteriaCount = Object.keys(criteria).length;
    if (criteriaCount < REVIEW_CRITERIA.length) {
      setError("Veuillez noter tous les critères");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await submitReviewAction({
      visitTokenId: tokenId,
      restaurantId,
      overallScore: computedOverallScore,
      criteria,
      comment: comment || undefined,
      visibilityType: visibility,
    });

    if (result.success) {
      setStep("success");
    } else {
      setError(result.error || "Erreur lors de la soumission");
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] text-white mb-3 shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            {restaurantName}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Avis vérifié par TrustReview
          </p>
        </div>

        {/* Step: Welcome */}
        {step === "welcome" && (
          <Card className="animate-scale-in">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">
                  Partagez votre expérience
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Votre avis compte ! Munissez-vous du code de visite (Token)
                  fourni par l'établissement.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 py-4">
                {[
                  { icon: "🔑", label: "Code visite" },
                  { icon: "⭐", label: "Évaluez" },
                  { icon: "✅", label: "Confirmé" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-[var(--color-bg-muted)]"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setStep("token")}
                className="w-full"
                size="lg"
              >
                Commencer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Step: Token */}
        {step === "token" && (
          <Card className="animate-scale-in">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Entrez votre code de visite (Token)
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Ce code certifié a été généré et fourni par le restaurant.
                </p>
              </div>

              <Input
                placeholder="Ex: A7B9P3"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value.toUpperCase());
                  setError("");
                }}
                error={error}
                className="text-center text-lg font-mono tracking-[0.3em] uppercase"
                maxLength={8}
                autoFocus
              />

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep("welcome")}
                  size="md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Button>
                <Button
                  onClick={handleValidateToken}
                  isLoading={isLoading}
                  className="flex-1"
                  size="md"
                >
                  Valider
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step: Review Form */}
        {step === "review" && (
          <Card className="animate-scale-in" padding="none">
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold">Votre avis</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Comment s'est passée votre visite ? Notez chaque critère.
                </p>
              </div>

              {/* Overall rating */}
              <div className="text-center py-4 rounded-xl bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Note globale (calculée automatiquement)
                </p>
                <div className="pointer-events-none opacity-90 inline-block">
                  <StarRating
                    value={computedOverallScore}
                    readonly
                    size="lg"
                    showValue
                  />
                </div>
              </div>

              {/* Criteria */}
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Détails par critère
                </p>
                <div className="rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)] overflow-hidden">
                  {REVIEW_CRITERIA.map((criterion) => (
                    <div key={criterion.key} className="px-3">
                      <CriterionRating
                        label={criterion.label}
                        icon={criterionIcons[criterion.key]}
                        value={criteria[criterion.key] || 0}
                        onChange={(v) =>
                          setCriteria((prev) => ({
                            ...prev,
                            [criterion.key]: v,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <Textarea
                label="Commentaire (optionnel)"
                placeholder="Partagez plus de détails sur votre expérience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={2000}
              />

              {/* Visibility */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Visibilité de l&apos;avis
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      value: "PUBLIC" as const,
                      label: "Public",
                      desc: "Visible par tous",
                    },
                    {
                      value: "PRIVATE" as const,
                      label: "Privé",
                      desc: "Visible par le restaurant uniquement (compte dans la note)",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                        visibility === option.value
                          ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] ring-1 ring-[var(--color-brand-500)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                      }`}
                    >
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-[var(--color-danger)] text-center">
                  {error}
                </p>
              )}

              <Button
                onClick={handleSubmitReview}
                isLoading={isLoading}
                className="w-full"
                size="lg"
              >
                Envoyer mon avis
              </Button>

              <p className="text-xs text-center text-[var(--color-text-muted)]">
                En soumettant, vous acceptez que cet avis soit associé à une
                preuve de visite vérifiée.
              </p>
            </div>
          </Card>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <Card className="animate-scale-in">
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Merci !</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Votre avis vérifié a été enregistré avec succès.
                  <br />
                  Il sera publié après vérification.
                </p>
              </div>
              <div className="pt-2 px-4 py-3 rounded-xl bg-[var(--color-bg-muted)] text-sm">
                <p className="font-medium text-[var(--color-text)]">
                  {restaurantName}
                </p>
                <div className="flex justify-center mt-2">
                  <StarRating
                    value={computedOverallScore}
                    readonly
                    size="sm"
                    showValue
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          Propulsé par{" "}
          <span className="font-semibold gradient-text">TrustReview</span>
        </p>
      </div>
    </div>
  );
}
