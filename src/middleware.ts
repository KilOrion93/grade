import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-not-for-production"
);

const publicPaths = ["/", "/login", "/r/", "/api/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    // Protect dashboard API routes
    if (pathname.startsWith("/api/analytics") || pathname.startsWith("/api/reviews") || pathname.startsWith("/api/export")) {
      const token = req.cookies.get("grade-session")?.value;
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      try {
        await jwtVerify(token, JWT_SECRET_KEY);
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Protect admin API routes
    if (pathname.startsWith("/api/admin")) {
      const token = req.cookies.get("grade-session")?.value;
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
        if ((payload as Record<string, unknown>).role !== "ADMIN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    return NextResponse.next();
  }

  // Protected pages (dashboard, admin)
  const token = req.cookies.get("grade-session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET_KEY);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/analytics/:path*",
    "/api/reviews/:path*",
    "/api/export/:path*",
    "/api/admin/:path*",
  ],
};
