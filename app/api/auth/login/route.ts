import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { checkRateLimit, enforceOrigin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    await enforceOrigin();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const rate = await checkRateLimit(`login:${ip}`, 8, 900);
    if ("unavailable" in rate && rate.unavailable && process.env.NODE_ENV === "production") return NextResponse.json({ message: "Login protection is temporarily unavailable." }, { status: 503 });
    if (!rate.allowed) return NextResponse.json({ message: "Too many attempts. Try again later." }, { status: 429 });
    const body = z.object({ password: z.string().min(1) }).parse(await request.json());
    if (!env.ADMIN_PASSWORD || body.password !== env.ADMIN_PASSWORD) return NextResponse.json({ message: "Invalid administrator password." }, { status: 401 });
    if (!env.SESSION_SECRET) return NextResponse.json({ message: "Authentication is not configured." }, { status: 503 });
    await createSession();
    return NextResponse.json({ ok: true }, {
      headers: {
        "cache-control": "no-store, private",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Enter your administrator password." }, { status: 400 });
    if (error instanceof Error && error.message === "FORBIDDEN_ORIGIN") return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
    console.error("Administrator login failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ message: "Unable to sign in. Check the deployment authentication configuration." }, { status: 503 });
  }
}
