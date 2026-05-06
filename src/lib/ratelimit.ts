import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRatelimiter(requests: number, window: `${number} s` | `${number} m`) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  });
}

export const searchRatelimit = createRatelimiter(20, "1 m");
export const reviewTokenRatelimit = createRatelimiter(5, "1 m");

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  if (!limiter) return { allowed: true, limit: 0, remaining: 0 };
  const result = await limiter.limit(identifier);
  return { allowed: result.success, limit: result.limit, remaining: result.remaining };
}
