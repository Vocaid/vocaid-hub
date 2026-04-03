import { auth } from "@/auth";
import { NextResponse } from "next/server";

const GATED_PREFIXES = [
  "/api/agents",
  "/api/gpu",
  "/api/payments",
  "/api/resources",
  "/api/predictions",
];

const EXEMPT_PREFIXES = [
  "/api/verify-proof",
  "/api/rp-signature",
  "/api/auth",
  "/api/initiate-payment",
  "/api/world-id",
];

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Only gate API routes
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Skip exempt paths
  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check if path needs World ID gating
  if (GATED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!req.auth?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify World ID on-chain via internal endpoint
    try {
      const checkUrl = new URL("/api/world-id/check", req.nextUrl.origin);
      checkUrl.searchParams.set("address", req.auth.user.id);
      const res = await fetch(checkUrl);
      const data = await res.json();

      if (!data.verified) {
        return NextResponse.json(
          { error: "World ID verification required", verifyUrl: "/verify" },
          { status: 403 },
        );
      }
    } catch {
      // If check fails, allow through (fail-open for demo resilience)
      console.error("[middleware] World ID check failed, allowing through");
    }
  }

  return NextResponse.next();
});
