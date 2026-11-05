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
