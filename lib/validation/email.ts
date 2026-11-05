import { z } from "zod";

const emails = z.string().trim().min(1).transform((value) => value.split(",").map((item) => item.trim()).filter(Boolean)).pipe(z.array(z.email()).min(1));
const optionalEmails = z.string().trim().transform((value) => value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []).pipe(z.array(z.email()));
const attachment = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(255).default("application/octet-stream"),
  content: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, "Invalid attachment encoding."),
}).superRefine((value, context) => {
  const bytes = Math.floor(value.content.length * 3 / 4) - (value.content.endsWith("==") ? 2 : value.content.endsWith("=") ? 1 : 0);
  if (bytes > 10 * 1024 * 1024) context.addIssue({ code: "custom", message: "Attachments must be 10 MB or smaller." });
});

export const emailSchema = z.object({
  to: emails, cc: optionalEmails.default([]), bcc: optionalEmails.default([]),
  replyTo: z.union([z.email(), z.literal("")]).default(""),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(1_000_000),
  text: z.string().max(500_000).default(""),
  attachments: z.array(attachment).max(10).default([]),
}).superRefine((value, context) => {
  const totalBytes = value.attachments.reduce((total, item) => {
    const padding = item.content.endsWith("==") ? 2 : item.content.endsWith("=") ? 1 : 0;
    return total + Math.floor(item.content.length * 3 / 4) - padding;
  }, 0);
  if (totalBytes > 25 * 1024 * 1024) context.addIssue({ code: "custom", path: ["attachments"], message: "Attachments must be 25 MB or smaller in total." });
});

export type EmailInput = z.infer<typeof emailSchema>;
