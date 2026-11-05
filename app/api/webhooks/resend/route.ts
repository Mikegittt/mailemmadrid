import { NextResponse } from "next/server";
import { insertEmail, updateEmailStatus, type EmailStatus } from "@/lib/database";
import { getReceivedEmail, verifyResendWebhook } from "@/lib/resend";
import { forwardInboundEmail } from "@/lib/forwarding";
import { env } from "@/lib/env";

const eventMap: Record<string, EmailStatus> = { "email.sent": "accepted", "email.delivered": "delivered", "email.delivery_delayed": "delayed", "email.bounced": "bounced", "email.complained": "complained", "email.failed": "failed" };

export async function POST(request: Request) {
  if (!env.RESEND_WEBHOOK_SECRET) return NextResponse.json({ message: "Webhook is not configured." }, { status: 503 });
  const rawBody = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return NextResponse.json({ message: "Missing signature." }, { status: 401 });

  let body: { type?: string; data?: { email_id?: string } };
  try {
    body = verifyResendWebhook(rawBody, { id, timestamp, signature }) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid signature." }, { status: 401 });
  }
  const emailId = body.data?.email_id;
  if (body.type === "email.received" && emailId) {
    try {
      const email = await getReceivedEmail(emailId);
      try {
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
      } catch (error) {
        console.error("Inbound email received but Inbox history persistence failed", error instanceof Error ? error.message : "unknown error");
      }
      await forwardInboundEmail(emailId, id);
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Inbound email processing failed", error instanceof Error ? error.message : "unknown error");
      return NextResponse.json({ message: "Inbound email processing failed." }, { status: 502 });
    }
  }
  const status = body.type ? eventMap[body.type] : undefined;
  if (status && emailId) await updateEmailStatus(emailId, status);
  return NextResponse.json({ received: true });
}
