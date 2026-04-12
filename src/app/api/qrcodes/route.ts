import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "Restaurant ID required" }, { status: 400 });
  }

  // Check access
  const membership = await db.staffMembership.findUnique({
    where: {
      userId_restaurantId: { userId: session.userId, restaurantId },
    },
  });

  if (!membership && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const qrCodes = await db.qrCode.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
  });

  // Generate data URLs for existing QR codes
  const qrCodesWithDataUrl = await Promise.all(
    qrCodes.map(async (qr) => {
      const dataUrl = await QRCode.toDataURL(qr.url, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      return { ...qr, dataUrl };
    })
  );

  return NextResponse.json({ qrCodes: qrCodesWithDataUrl });
}
