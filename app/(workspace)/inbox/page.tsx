import { listReceivedEmails } from "@/lib/database";
import { Inbox as InboxIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const records = await listReceivedEmails();
  return <div className="mx-auto max-w-7xl">
    <p className="text-sm font-medium text-blue-600">Inbox</p>
    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Received emails</h1>
    <p className="mt-2 text-slate-500">Messages received by your configured Resend inbound domain.</p>
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {records.length === 0 ? <div className="p-12 text-center text-sm text-slate-500"><InboxIcon className="mx-auto text-slate-300" size={32} /><p className="mt-3 font-medium text-slate-700">No received emails yet</p><p className="mt-1">Configure a Resend receiving domain and the email.received webhook to populate this inbox.</p></div> : <div className="divide-y divide-slate-100">{records.map((record) => <article key={record.id} className="p-5"><div className="flex flex-col justify-between gap-2 sm:flex-row"><div><p className="font-medium">{record.subject || "(No subject)"}</p><p className="mt-1 text-sm text-slate-500">From {record.from} to {record.to.join(", ")}</p></div><time className="text-sm text-slate-500">{new Date(record.created_at).toLocaleString()}</time></div>{record.html ? <iframe title={`Received email: ${record.subject}`} sandbox="" srcDoc={record.html} className="mt-5 h-64 w-full rounded-xl border border-slate-200 bg-white" /> : <p className="mt-5 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{record.text || "This message has no text body."}</p>}</article>)}</div>}
    </div>
  </div>;
}
