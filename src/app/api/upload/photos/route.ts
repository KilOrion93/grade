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

    const count = await db.businessPhoto.count({ where: { businessId } });
    if (count >= 6) {
      return NextResponse.json({ error: "Maximum 6 photos" }, { status: 400 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "Fichiers requis" }, { status: 400 });
    }

    const slots = 6 - count;
    const toUpload = files.slice(0, slots);

    const last = await db.businessPhoto.findFirst({
      where: { businessId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = (last?.order ?? -1) + 1;

    const created = await Promise.all(
      toUpload.map(async (file) => {
        if (file.size > 4 * 1024 * 1024) throw new Error("Fichier trop volumineux (max 4 Mo)");
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `photos/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const url = await uploadToStorage(file, path);
        const photo = await db.businessPhoto.create({
          data: { businessId, url, order: nextOrder++ },
        });
        return photo;
      })
    );

    return NextResponse.json({ photos: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
