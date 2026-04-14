import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

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

  const normalizedQrCodes = qrCodes.map((qr) => ({
    ...qr,
    url: normalizeQrPath(qr.url),
  }));

  return NextResponse.json({ qrCodes: normalizedQrCodes });
}
