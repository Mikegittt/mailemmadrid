import { headers } from "next/headers";
import { env } from "@/lib/env";
import { Redis } from "@upstash/redis";

const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
  : null;

export function redisConfigured() { return Boolean(redis); }

export async function enforceOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  const host = headerList.get("host");
  if (origin && host && new URL(origin).host !== host) throw new Error("FORBIDDEN_ORIGIN");
}

export async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  if (!redis) return { allowed: true, persistent: false, remaining: limit };
  try {
    const bucket = `emmadrid:rate:${key}`;
    const count = await Promise.race([
      redis.incr(bucket),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("RATE_LIMIT_SERVICE_TIMEOUT")), 3000)),
    ]);
    if (count === 1) await redis.expire(bucket, windowSeconds);
    return { allowed: count <= limit, persistent: true, remaining: Math.max(0, limit - count), unavailable: false };
  } catch (error) {
    console.error("Persistent rate limiting unavailable", error);
    if (process.env.NODE_ENV === "production") return { allowed: false, persistent: false, remaining: 0, unavailable: true };
    return { allowed: true, persistent: false, remaining: limit, unavailable: true };
  }
}
