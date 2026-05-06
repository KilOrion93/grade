import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { uploadToStorage } from "@/lib/supabase-storage";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const businessId = req.headers.get("x-business-id");

    if (!businessId) {
      return NextResponse.json({ error: "businessId requis" }, { status: 400 });
    }

    if (session.role !== "ADMIN") {
      const membership = await db.staffMembership.findUnique({
        where: { userId_businessId: { userId: session.userId, businessId } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 2 Mo)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `logos/${businessId}.${ext}`;
    const url = await uploadToStorage(file, path);

    await db.business.update({
      where: { id: businessId },
      data: { logoUrl: url },
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
