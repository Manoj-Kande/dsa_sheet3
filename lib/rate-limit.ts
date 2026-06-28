import { NextRequest, NextResponse } from "next/server";

// Uses Upstash Redis if env vars are set, otherwise falls back to in-memory
// (in-memory is per-instance, fine for dev/low traffic)

interface RateLimitStore {
  check: (key: string, limit: number, windowMs: number) => Promise<{ ok: boolean; remaining: number }>;
}

// In-memory fallback (per serverless instance)
const memStore = new Map<string, { count: number; reset: number }>();

const inMemoryStore: RateLimitStore = {
  check: async (key, limit, windowMs) => {
    const now = Date.now();
    const entry = memStore.get(key);
    if (!entry || now > entry.reset) {
      memStore.set(key, { count: 1, reset: now + windowMs });
      return { ok: true, remaining: limit - 1 };
    }
    entry.count++;
    return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
  },
};

async function getStore(): Promise<RateLimitStore> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, "1 m"),
    });
    return {
      check: async (key) => {
        const { success, remaining } = await ratelimit.limit(key);
        return { ok: success, remaining };
      },
    };
  }
  return inMemoryStore;
}

export async function rateLimit(
  req: NextRequest,
  options: { limit?: number; windowMs?: number } = {}
): Promise<NextResponse | null> {
  const { limit = 60, windowMs = 60_000 } = options;
  
  // Key by userId header (set by Clerk) or IP
  const userId = req.headers.get("x-clerk-user-id") ?? 
                 req.headers.get("x-forwarded-for") ?? 
                 "anonymous";
  const key = `rl:${req.nextUrl.pathname}:${userId}`;

  try {
    const store = await getStore();
    const { ok, remaining } = await store.check(key, limit, windowMs);
    if (!ok) {
      return NextResponse.json(
        { data: null, error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
        { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } }
      );
    }
  } catch (err) {
    // Never block requests due to rate limit errors
    console.error("[rateLimit]", err);
  }
  return null;
}
