import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory sliding window rate limiter.
 * Not suitable for production (use Redis/Upstash for distributed systems).
 * Sufficient for hackathon demo protection.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Check rate limit for a request. Returns null if allowed, NextResponse if blocked.
 *
 * @param req - The incoming request
 * @param maxRequests - Maximum requests per window (default: 30)
 * @param windowMs - Window duration in ms (default: 60000 = 1 minute)
 */
export function checkRateLimit(
  req: NextRequest,
  maxRequests = 30,
  windowMs = 60_000,
): NextResponse | null {
  const ip = getClientIP(req);
  const key = `${ip}:${req.nextUrl.pathname}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
        },
      },
    );
  }

  return null;
}
