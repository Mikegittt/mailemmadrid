import { claimForwardingEvent, completeForwardingEvent, getForwardingSettings } from "@/lib/database";
import { forwardReceivedEmail, getReceivedAttachment, getReceivedEmail, listReceivedAttachments } from "@/lib/resend";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_SINGLE_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function addresses(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(addresses);
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export async function forwardInboundEmail(emailId: string, eventId: string) {
  const settings = await getForwardingSettings();
  if (settings.status === "not_configured") throw new Error("Email forwarding is not configured");
  if (!settings.enabled) return { forwarded: false, disabled: true };

  const email = await getReceivedEmail(emailId);
  const source = settings.source.toLowerCase();
  const recipients = [...addresses(email.to), ...addresses(email.received_for)];
  if (!recipients.includes(source)) return { forwarded: false, ignored: true };

  const existing = await claimForwardingEvent(emailId, eventId);
  if (existing.status === "forwarded") return { forwarded: false, duplicate: true };
  if (existing.status === "processing") return { forwarded: false, duplicate: true };

  try {
    const metadata = await listReceivedAttachments(emailId);
    let totalBytes = 0;
    const attachments = [];
    for (const item of metadata || []) {
      const attachment = await getReceivedAttachment(emailId, item.id);
      if (!item.filename) throw new Error("Inbound attachment has no filename");
      if (!attachment.download_url) throw new Error(`Attachment "${item.filename}" has no download URL`);
      const response = await fetch(attachment.download_url);
      if (!response.ok) throw new Error(`Attachment "${item.filename}" could not be downloaded`);
      const content = Buffer.from(await response.arrayBuffer());
      if (content.length > MAX_SINGLE_ATTACHMENT_BYTES) throw new Error(`Attachment "${item.filename}" exceeds the 10 MB forwarding limit`);
      totalBytes += content.length;
      if (totalBytes > MAX_ATTACHMENT_BYTES) throw new Error("Inbound attachments exceed the 25 MB forwarding limit");
      attachments.push({ filename: item.filename, content, contentType: item.content_type || undefined });
    }

    const originalHtml = email.html || `<pre>${email.text || ""}</pre>`;
    const originalText = email.text || "";
    const marker = "Forwarded automatically by EMMADRID Mail Center";
    const result = await forwardReceivedEmail({
      from: settings.source,
      to: settings.destination,
      subject: `[Forwarded] ${email.subject || "(no subject)"}`,
      html: `<p><strong>${marker}</strong></p><hr />${originalHtml}`,
      text: `${marker}\n\n--- Original message ---\n\nFrom: ${email.from}\nTo: ${recipients.join(", ")}\nSubject: ${email.subject || "(no subject)"}\n\n${originalText}`,
      attachments,
    });
    await completeForwardingEvent(emailId, "forwarded", result.id, null);
    return { forwarded: true, forwardedId: result.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Forwarding failed";
    await completeForwardingEvent(emailId, "failed", null, message.slice(0, 500));
    throw error;
  }
}
