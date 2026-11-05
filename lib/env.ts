import { z } from "zod";

const optionalString = z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional());
const envSchema = z.object({
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalString,
  ADMIN_PASSWORD: optionalString,
  SESSION_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional()),
  UPSTASH_REDIS_REST_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  RESEND_WEBHOOK_SECRET: optionalString,
});

export const env = envSchema.parse({
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  SESSION_SECRET: process.env.SESSION_SECRET,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
});
