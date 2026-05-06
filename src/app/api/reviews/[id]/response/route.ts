import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireBusinessAccess } from "@/lib/session";
import { z } from "zod";

const responseSchema = z.object({
  content: z.string().min(1, "La réponse ne peut pas être vide").max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;

    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { businessId: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
    }

    await requireBusinessAccess(review.businessId);

    const body = await req.json();
    const parsed = responseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
    }

    const response = await db.reviewResponse.upsert({
      where: { reviewId },
      create: {
        reviewId,
        businessId: review.businessId,
        content: parsed.data.content,
      },
      update: { content: parsed.data.content },
    });

    return NextResponse.json({ response });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;

    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { businessId: true },
    });

    if (!review) {
      return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
    }

    await requireBusinessAccess(review.businessId);

    await db.reviewResponse.deleteMany({ where: { reviewId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
