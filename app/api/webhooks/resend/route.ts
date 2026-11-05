import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { insertEmail, updateEmailStatus, type EmailStatus } from "@/lib/database";
import { getReceivedEmail } from "@/lib/resend";
import { env } from "@/lib/env";

const eventMap: Record<string, EmailStatus> = { "email.sent": "accepted", "email.delivered": "delivered", "email.delivery_delayed": "delayed", "email.bounced": "bounced", "email.complained": "complained", "email.failed": "failed" };
export async function POST(request: Request) {
  if (!env.RESEND_WEBHOOK_SECRET) return NextResponse.json({ message: "Webhook is not configured." }, { status: 503 });
  const signature = request.headers.get("svix-signature");
  const webhookId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  if (!signature || !webhookId || !timestamp) return NextResponse.json({ message: "Missing signature." }, { status: 401 });
  const rawBody = await request.text();
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return NextResponse.json({ message: "Expired webhook." }, { status: 401 });
  const secret = env.RESEND_WEBHOOK_SECRET!.replace(/^whsec_/, "");
  const key = Buffer.from(secret, "base64");
  const expected = crypto.createHmac("sha256", key).update(`${webhookId}.${timestamp}.${rawBody}`).digest("base64");
  const valid = signature.split(" ").some((item) => { const provided = item.replace(/^v\d+,/, ""); const a = Buffer.from(provided); const b = Buffer.from(expected); return a.length === b.length && crypto.timingSafeEqual(a, b); });
  if (!valid) return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  const body = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string } };
  if (body.type === "email.received" && body.data?.email_id) {
    const email = await getReceivedEmail(body.data.email_id);
    await insertEmail({
      direction: "received",
      resend_id: email.id,
      to: email.received_for.length ? email.received_for : email.to,
      from: email.from,
      subject: email.subject,
      status: "accepted",
      html: email.html || undefined,
      text: email.text || undefined,
    });
    return NextResponse.json({ received: true });
  }
  const status = body.type ? eventMap[body.type] : undefined;
  if (status && body.data?.email_id) await updateEmailStatus(body.data.email_id, status);
  return NextResponse.json({ received: true });
}
