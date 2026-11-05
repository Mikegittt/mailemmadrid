import { Resend } from "resend";
import { env } from "@/lib/env";
import type { EmailInput } from "@/lib/validation/email";

export function getResend() {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(env.RESEND_API_KEY);
}

export async function sendEmail(input: EmailInput) {
  if (!env.RESEND_FROM_EMAIL) throw new Error("RESEND_FROM_EMAIL is not configured");
  const result = await getResend().emails.send({
    from: env.RESEND_FROM_EMAIL, to: input.to, cc: input.cc, bcc: input.bcc,
    replyTo: input.replyTo || undefined, subject: input.subject, html: input.html,
    text: input.text || undefined,
    attachments: input.attachments.map((item) => ({ filename: item.filename, content: Buffer.from(item.content, "base64"), contentType: item.contentType })),
  });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function getReceivedEmail(id: string) {
  const result = await getResend().emails.receiving.get(id);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function listReceivedAttachments(emailId: string) {
  const result = await getResend().emails.receiving.attachments.list({ emailId });
  if (result.error) throw new Error(result.error.message);
  return result.data.data;
}

export async function getReceivedAttachment(emailId: string, attachmentId: string) {
  const result = await getResend().emails.receiving.attachments.get({ emailId, id: attachmentId });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export function verifyResendWebhook(payload: string, headers: { id: string; timestamp: string; signature: string }) {
  if (!env.RESEND_WEBHOOK_SECRET) throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  return getResend().webhooks.verify({ payload, headers, webhookSecret: env.RESEND_WEBHOOK_SECRET });
}

export async function forwardReceivedEmail(input: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  attachments: Array<{ filename: string; content: Buffer; contentType?: string }>;
}) {
  const result = await getResend().emails.send({
    from: input.from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments,
  });
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Resend did not return a forwarding email ID");
  return result.data;
}
