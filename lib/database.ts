import crypto from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export type EmailStatus = "accepted" | "delivered" | "bounced" | "failed" | "complained" | "delayed";
export type EmailDirection = "sent" | "received";
export type EmailRecord = { id: string; resend_id: string; direction: EmailDirection; to: string[]; subject: string; from: string; status: EmailStatus; created_at: string; html?: string; text?: string };
export type Template = { id: string; name: string; subject: string; html: string; text: string; created_at: string; updated_at: string };
export type ForwardingSettings = { enabled: boolean; source: string; destination: string; status: "ready" | "disabled" | "not_configured"; last_forwarded_at: string | null };
export type ForwardingEvent = { email_id: string; event_id: string; status: "processing" | "forwarded" | "failed"; forwarded_id: string | null; error: string | null; updated_at: string };

const client = process.env.NODE_ENV === "production"
  && env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
  && /^eyJ/.test(env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const starterTemplates: Template[] = [
  { id: "business", name: "Professional business email", subject: "A quick update from our team", html: "<h2>Hello {{name}},</h2><p>Thank you for your time. We wanted to share a quick update with you.</p><p>Best regards,<br />The team</p>", text: "Hello {{name}},\n\nThank you for your time. We wanted to share a quick update with you.\n\nBest regards,\nThe team", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "welcome", name: "Welcome email", subject: "Welcome to our community", html: "<h1>Welcome, {{name}}!</h1><p>We are delighted to have you with us.</p>", text: "Welcome, {{name}}!\n\nWe are delighted to have you with us.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "notification", name: "Account notification", subject: "Important account notification", html: "<h2>Account notification</h2><p>There is an important update regarding your account.</p>", text: "Account notification\n\nThere is an important update regarding your account.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "follow-up", name: "Follow-up email", subject: "Following up", html: "<p>Hello {{name}},</p><p>I wanted to follow up on our recent conversation.</p>", text: "Hello {{name}},\n\nI wanted to follow up on our recent conversation.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "announcement", name: "General announcement", subject: "An announcement from our team", html: "<h1>We have news!</h1><p>Here is the latest announcement from our team.</p>", text: "We have news!\n\nHere is the latest announcement from our team.", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const localStorePath = path.join(process.cwd(), ".data", "email-records.json");
const localForwardingPath = path.join(process.cwd(), ".data", "forwarding.json");
let localWriteQueue = Promise.resolve();

async function readLocalEmails(): Promise<EmailRecord[]> {
  try {
    return JSON.parse(await readFile(localStorePath, "utf8")) as EmailRecord[];
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalEmails(records: EmailRecord[]) {
  await mkdir(path.dirname(localStorePath), { recursive: true });
  const temporaryPath = `${localStorePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(records, null, 2), "utf8");
  await rename(temporaryPath, localStorePath);
}

async function updateLocalEmails(update: (records: EmailRecord[]) => EmailRecord[]) {
  let result: EmailRecord[] = [];
  localWriteQueue = localWriteQueue.then(async () => {
    const records = await readLocalEmails();
    result = update(records);
    await writeLocalEmails(result);
  });
  await localWriteQueue;
  return result;
}
async function readLocalForwarding(): Promise<{ settings?: ForwardingSettings; events: ForwardingEvent[] }> {
  try { return JSON.parse(await readFile(localForwardingPath, "utf8")) as { settings?: ForwardingSettings; events: ForwardingEvent[] }; }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return { events: [] }; throw error; }
}
async function writeLocalForwarding(value: { settings?: ForwardingSettings; events: ForwardingEvent[] }) {
  await mkdir(path.dirname(localForwardingPath), { recursive: true });
  const temporaryPath = `${localForwardingPath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
  await rename(temporaryPath, localForwardingPath);
}

export function databaseConfigured() { return Boolean(client); }
export async function getForwardingSettings(): Promise<ForwardingSettings> {
  const fallback: ForwardingSettings = {
    enabled: env.EMAIL_FORWARD_ENABLED === "true",
    source: env.EMAIL_FORWARD_FROM || "",
    destination: env.EMAIL_FORWARD_TO || "",
    status: env.EMAIL_FORWARD_FROM && env.EMAIL_FORWARD_TO ? (env.EMAIL_FORWARD_ENABLED === "false" ? "disabled" : "ready") : "not_configured",
    last_forwarded_at: null,
  };
  if (!client) return { ...fallback, ...(await readLocalForwarding()).settings };
  const { data, error } = await client.from("forwarding_settings").select("*").eq("id", "default").maybeSingle();
  if (error) { if (isMissingTableError(error)) return fallback; throw error; }
  return data ? { ...fallback, ...data } as ForwardingSettings : fallback;
}
export async function setForwardingEnabled(enabled: boolean) {
  const settings: ForwardingSettings = { ...(await getForwardingSettings()), enabled, status: enabled ? "ready" : "disabled" };
  if (!client) { const state = await readLocalForwarding(); await writeLocalForwarding({ ...state, settings }); return settings; }
  const { data, error } = await client.from("forwarding_settings").upsert({ id: "default", enabled, source: settings.source, destination: settings.destination, status: settings.status, last_forwarded_at: settings.last_forwarded_at }).select().single();
  if (error) throw error; return data as ForwardingSettings;
}
export async function claimForwardingEvent(emailId: string, eventId: string) {
  if (!client) {
    const state = await readLocalForwarding();
    const existing = state.events.find((event) => event.email_id === emailId);
    if (existing) return existing;
    const event: ForwardingEvent = { email_id: emailId, event_id: eventId, status: "processing", forwarded_id: null, error: null, updated_at: new Date().toISOString() };
    await writeLocalForwarding({ ...state, events: [event, ...state.events] });
    return event;
  }
  const { data, error } = await client.from("email_forwarding_events").insert({ email_id: emailId, event_id: eventId, status: "processing" }).select().single();
  if (!error) return data as ForwardingEvent;
  if (error.code !== "23505") throw error;
  const existing = await client.from("email_forwarding_events").select("*").eq("email_id", emailId).single();
  if (existing.error) throw existing.error;
  return existing.data as ForwardingEvent;
}
export async function completeForwardingEvent(emailId: string, status: ForwardingEvent["status"], forwardedId: string | null, errorMessage: string | null) {
  const updatedAt = new Date().toISOString();
  if (!client) {
    const state = await readLocalForwarding();
    await writeLocalForwarding({ ...state, events: state.events.map((event) => event.email_id === emailId ? { ...event, status, forwarded_id: forwardedId, error: errorMessage, updated_at: updatedAt } : event), settings: status === "forwarded" && state.settings ? { ...state.settings, last_forwarded_at: updatedAt } : state.settings });
    return;
  }
  const { error } = await client.from("email_forwarding_events").update({ status, forwarded_id: forwardedId, error: errorMessage, updated_at: updatedAt }).eq("email_id", emailId);
  if (error) throw error;
  if (status === "forwarded") await client.from("forwarding_settings").upsert({ id: "default", enabled: true, source: env.EMAIL_FORWARD_FROM || "", destination: env.EMAIL_FORWARD_TO || "", status: "ready", last_forwarded_at: updatedAt });
}
function isMissingTableError(error: unknown) {
  return error instanceof Object && "code" in error && (error as { code?: string }).code === "PGRST205";
}
export async function insertEmail(record: Omit<EmailRecord, "id" | "created_at">) {
  const completeRecord = { ...record, direction: record.direction || "sent" as EmailDirection, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  if (!client) {
    const records = await updateLocalEmails((current) => {
      const existing = current.find((item) => item.resend_id === record.resend_id);
      return existing ? current : [completeRecord, ...current];
    });
    return records.find((item) => item.resend_id === record.resend_id) || completeRecord;
  }
  const { data, error } = await client.from("email_records").upsert(completeRecord, { onConflict: "resend_id" }).select().single();
  if (error) {
    if (isMissingTableError(error)) {
      console.error("Email history is unavailable because the email_records table is not configured.");
      return completeRecord;
    }
    throw error;
  }
  return data as EmailRecord;
}
export async function listEmails(direction: EmailDirection = "sent") {
  if (!client) return (await readLocalEmails()).filter((item) => item.direction === direction);
  const { data, error } = await client.from("email_records").select("*").eq("direction", direction).order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      console.error("Email history is unavailable because the email_records table is not configured.");
      return [];
    }
    throw error;
  }
  return data as EmailRecord[];
}
export async function listReceivedEmails() { return listEmails("received"); }
export async function listTemplates() {
  if (!client) return starterTemplates;
  const { data, error } = await client.from("email_templates").select("*").order("updated_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      console.error("Templates are unavailable because the email_templates table is not configured.");
      return starterTemplates;
    }
    throw error;
  }
  return data as Template[];
}
export async function saveTemplate(template: { id?: string; name: string; subject: string; html: string; text: string }) {
  if (!client) return { ...template, id: template.id || crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Template;
  const { data, error } = await client.from("email_templates").upsert({ ...template, updated_at: new Date().toISOString() }).select().single();
  if (error) throw error; return data as Template;
}
export async function deleteTemplate(id: string) {
  if (!client) return;
  const { error } = await client.from("email_templates").delete().eq("id", id);
  if (error) throw error;
}
export async function updateEmailStatus(resend_id: string, status: EmailStatus) {
  if (!client) {
    await updateLocalEmails((records) => records.map((record) => record.resend_id === resend_id ? { ...record, status } : record));
    return;
  }
  const { error } = await client.from("email_records").update({ status }).eq("resend_id", resend_id);
  if (error) throw error;
}
