import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { emailSchema } from "@/lib/validation/email";
import { sendEmail } from "@/lib/resend";
import { insertEmail } from "@/lib/database";
import { checkRateLimit, enforceOrigin } from "@/lib/security";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    await requireSession(); await enforceOrigin();
    const rate = await checkRateLimit("send:administrator", 100, 86400);
    if ("unavailable" in rate && rate.unavailable && process.env.NODE_ENV === "production") return NextResponse.json({ message: "Sending protection is temporarily unavailable." }, { status: 503 });
    if (!rate.allowed) return NextResponse.json({ message: "Daily sending quota reached." }, { status: 429 });
    const input = emailSchema.parse(await request.json());
    const result = await sendEmail(input);
    if (!result?.id) throw new Error("Resend did not return an email ID");
    let record;
    try {
      record = await insertEmail({ direction: "sent", resend_id: result.id, to: input.to, subject: input.subject, from: env.RESEND_FROM_EMAIL || "configured sender", status: "accepted", html: input.html, text: input.text });
    } catch (error) {
      console.error("Email accepted by Resend but history persistence failed", error instanceof Error ? error.message : "unknown error");
    }
    return NextResponse.json({ ok: true, id: result.id, record, historySaved: Boolean(record) });
  } catch (error) {
    if (error instanceof Error) console.error("Email send failed", error.message);
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Please check the recipient, subject, and message fields.", issues: error.issues }, { status: 400 });
    if (error instanceof Error && error.message.includes("configured")) return NextResponse.json({ message: "Email service is not configured." }, { status: 503 });
    const message = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Resend rejected the email submission.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
