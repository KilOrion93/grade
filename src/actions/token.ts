"use server";

import { db } from "@/lib/db";
import { requireRestaurantAccess } from "@/lib/session";
import { tokenGenerationSchema } from "@/lib/validations";
import { generateToken } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import QRCode from "qrcode";

interface TokenResult {
  success: boolean;
  tokens?: { token: string; expiresAt: Date }[];
  error?: string;
}

export async function generateTokensAction(
  data: unknown
): Promise<TokenResult> {
  const parsed = tokenGenerationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Paramètres invalides" };
  }

  const { restaurantId, count, expiresInHours } = parsed.data;

  const session = await requireRestaurantAccess(restaurantId);

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const tokensToCreate: { token: string; restaurantId: string; expiresAt: Date }[] = [];
  const existingTokens = new Set<string>();

  // Generate unique tokens
  while (tokensToCreate.length < count) {
    const token = generateToken(6);
    if (existingTokens.has(token)) continue;

    const exists = await db.visitToken.findUnique({
      where: { token },
    });

    if (!exists) {
      existingTokens.add(token);
      tokensToCreate.push({
        token,
        restaurantId,
        expiresAt,
      });
    }
  }

  await db.visitToken.createMany({
    data: tokensToCreate,
  });

  await logAudit({
    userId: session.userId,
    action: "token.generate",
    entity: "restaurant",
    entityId: restaurantId,
    metadata: { count, expiresInHours },
  });

  return {
    success: true,
    tokens: tokensToCreate.map((t) => ({
      token: t.token,
      expiresAt: t.expiresAt,
    })),
  };
}

export async function generateQrCodeAction(
  restaurantId: string,
  label?: string
): Promise<{ success: boolean; qrCodeId?: string; url?: string; dataUrl?: string; error?: string }> {
  const session = await requireRestaurantAccess(restaurantId);

  const restaurant = await db.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    return { success: false, error: "Restaurant introuvable" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${appUrl}/r/${restaurant.slug}/review`;

  const dataUrl = await QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });

  const qr = await db.qrCode.create({
    data: {
      restaurantId,
      url,
      label: label || `QR ${restaurant.name}`,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "qrcode.create",
    entity: "qrcode",
    entityId: qr.id,
    metadata: { restaurantId, url },
  });

  return { success: true, qrCodeId: qr.id, url, dataUrl };
}
