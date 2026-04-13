"use server";

import { db } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/session";
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

  const { businessId, count, expiresInHours } = parsed.data;

  const session = await requireBusinessAccess(businessId);

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const tokensToCreate: { token: string; businessId: string; expiresAt: Date }[] = [];
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
        businessId,
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
    entity: "business",
    entityId: businessId,
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
  businessId: string,
  label?: string
): Promise<{ success: boolean; qrCodeId?: string; url?: string; dataUrl?: string; error?: string }> {
  const session = await requireBusinessAccess(businessId);

  const business = await db.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    return { success: false, error: "Business introuvable" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${appUrl}/r/${business.slug}/review`;

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
      businessId,
      url,
      label: label || `QR ${business.name}`,
    },
  });

  await logAudit({
    userId: session.userId,
    action: "qrcode.create",
    entity: "qrcode",
    entityId: qr.id,
    metadata: { businessId, url },
  });

  return { success: true, qrCodeId: qr.id, url, dataUrl };
}
