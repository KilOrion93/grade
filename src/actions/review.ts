"use server";

import { db } from "@/lib/db";
import { reviewSchema } from "@/lib/validations";
import { computeTrustScore, hashIp, REVIEW_CRITERIA } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { headers } from "next/headers";

interface ReviewResult {
  success: boolean;
  error?: string;
}

export async function submitReviewAction(
  data: unknown
): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Données invalides. Veuillez vérifier votre saisie." };
  }

  const { visitTokenId, restaurantId, overallScore, criteria, comment, visibilityType } =
    parsed.data;

  // Validate criteria keys
  const validKeys = REVIEW_CRITERIA.map((c) => c.key);
  for (const key of Object.keys(criteria)) {
    if (!validKeys.includes(key as typeof validKeys[number])) {
      return { success: false, error: `Critère inconnu : ${key}` };
    }
  }

  // Use a transaction to atomically validate token + create review
  try {
    const result = await db.$transaction(async (tx) => {
      const token = await tx.visitToken.findUnique({
        where: { id: visitTokenId },
      });

      if (!token) {
        throw new Error("Token de visite introuvable");
      }

      if (token.isUsed) {
        throw new Error("Ce token a déjà été utilisé");
      }

      if (token.expiresAt < new Date()) {
        throw new Error("Ce token a expiré");
      }

      if (token.restaurantId !== restaurantId) {
        throw new Error("Token invalide pour cet établissement");
      }

      // Mark token as used
      await tx.visitToken.update({
        where: { id: visitTokenId },
        data: { isUsed: true },
      });

      // Get IP hash for anti-abuse
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
      const userAgent = headersList.get("user-agent") || undefined;

      // Compute trust score
      const trustScore = computeTrustScore({
        hasComment: !!comment && comment.length > 10,
        criteriaCount: Object.keys(criteria).length,
        tokenAge: Date.now() - token.createdAt.getTime(),
      });

      // Create review
      const review = await tx.review.create({
        data: {
          restaurantId,
          visitTokenId,
          overallScore,
          comment: comment || null,
          visibilityType,
          moderationStatus: "PENDING",
          trustScore,
          ipHash: hashIp(ip),
          userAgent: userAgent?.substring(0, 200),
          criterionScores: {
            create: Object.entries(criteria).map(([criterionName, score]) => ({
              criterionName,
              score,
            })),
          },
        },
      });

      return review;
    });

    await logAudit({
      action: "review.create",
      entity: "review",
      entityId: result.id,
      metadata: { restaurantId, trustScore: result.trustScore },
    });

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur lors de la soumission";
    return { success: false, error: message };
  }
}

export async function validateTokenAction(
  token: string,
  restaurantSlug: string
): Promise<{
  valid: boolean;
  tokenId?: string;
  restaurantId?: string;
  restaurantName?: string;
  error?: string;
}> {
  try {
    const restaurant = await db.restaurant.findUnique({
      where: { slug: restaurantSlug },
    });

    if (!restaurant || !restaurant.isActive) {
      return { valid: false, error: "Établissement introuvable" };
    }

    const visitToken = await db.visitToken.findFirst({
      where: {
        token: token.toUpperCase().trim(),
        restaurantId: restaurant.id,
      },
    });

    if (!visitToken) {
      return { valid: false, error: "Code de visite invalide" };
    }

    if (visitToken.isUsed) {
      return { valid: false, error: "Ce code a déjà été utilisé" };
    }

    if (visitToken.expiresAt < new Date()) {
      return { valid: false, error: "Ce code a expiré" };
    }

    return {
      valid: true,
      tokenId: visitToken.id,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    };
  } catch {
    return { valid: false, error: "Erreur de vérification" };
  }
}
