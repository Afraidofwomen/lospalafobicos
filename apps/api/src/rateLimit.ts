import type { MiddlewareHandler } from "hono";
import { errorBody } from "./schemas.ts";

const hits = new Map<string, number[]>();

export function resetRateLimits(): void {
  hits.clear();
}

export function rateLimit(limit: number): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < 60_000);
    if (recent.length >= limit) {
      return c.json(errorBody("rate_limited", "Demasiadas peticiones. Espera un momento."), 429);
    }
    recent.push(now);
    hits.set(key, recent);
    await next();
  };
}
