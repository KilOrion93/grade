import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import QRCode from "qrcode";

function normalizeQrPath(value: string) {
  if (value.startsWith("/")) {
    return value;
  }

  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "Business ID required" }, { status: 400 });
  }

  // Check access
  const membership = await db.staffMembership.findUnique({
    where: {
      userId_businessId: { userId: session.userId, businessId },
    },
  });

  if (!membership && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const qrCodes = await db.qrCode.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  // Generate data URLs for existing QR codes
  const qrCodesWithDataUrl = await Promise.all(
    qrCodes.map(async (qr) => {
      const url = normalizeQrPath(qr.url);
      const absoluteUrl = new URL(url, req.nextUrl.origin).toString();
      const dataUrl = await QRCode.toDataURL(absoluteUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      return { ...qr, url, dataUrl };
    })
  );

  return NextResponse.json({ qrCodes: qrCodesWithDataUrl });
}
