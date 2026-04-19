import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

/**
 * Rate-limit configuration for a single route.
 */
export interface RouteRateLimit {
  /** Maximum requests within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /**
   * How to identify the caller:
   * - "user"   — use authenticated user ID (falls back to IP if unauthenticated)
   * - "ip"     — always use the client IP address
   */
  identifyBy?: "user" | "ip";
}

/**
 * Extract the caller identifier from a request.
 * Tries `x-user-id` header (injected by auth layer), then falls back to IP.
 */
function extractIdentifier(
  req: Request,
  identifyBy: "user" | "ip" = "ip",
): string {
  if (identifyBy === "user") {
    const userId = req.headers.get("x-user-id");
    if (userId) return `user:${userId}`;
  }
  // Fallback: use IP address from forwarded headers
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  return `ip:${ip}`;
}

/**
 * Apply rate limiting to a request.
 *
 * Returns `null` if the request is allowed, or a 429 Response if exceeded.
 *
 * @param request   - The incoming request (Request or NextRequest).
 * @param route     - Route label for the key (e.g., "feedback", "briefs-today").
 * @param config    - Rate-limit configuration.
 */
export async function applyRateLimit(
  request: Request,
  route: string,
  config: RouteRateLimit,
): Promise<NextResponse<unknown> | null> {
  const identifier = extractIdentifier(request, config.identifyBy ?? "ip");
  const key = rateLimitKey(route, identifier, config.windowMs);

  const result = await checkRateLimit(key, config.limit, config.windowMs);

  if (!result.allowed) {
    const retryAfter = result.retryAfter ?? Math.ceil(config.windowMs / 1000);
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil(Date.now() / 1000) + retryAfter,
          ),
        },
      },
    );
  }

  return null;
}
