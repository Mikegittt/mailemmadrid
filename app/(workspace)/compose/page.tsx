import { EmailComposer } from "@/components/email-composer";
import { listTemplates } from "@/lib/database";
export default async function ComposePage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const params = await searchParams; const template = params.template ? (await listTemplates()).find((item) => item.id === params.template) : undefined;
  return <div className="mx-auto max-w-4xl"><p className="text-sm font-medium text-blue-600">Compose email</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Send a new message</h1><p className="mt-2 text-slate-500">The sender identity is controlled by your server configuration.</p><div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><EmailComposer initial={template ? { subject: template.subject, html: template.html, text: template.text } : undefined} /></div></div>;
}
