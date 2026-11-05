"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Eye, Code2, Send, Bold, Italic, List, Link as LinkIcon, Paperclip, X } from "lucide-react";

type Attachment = { filename: string; contentType: string; content: string; size: number };

export function EmailComposer({ initial }: { initial?: { subject: string; html: string; text: string } }) {
  const [values, setValues] = useState({ to: "", cc: "", bcc: "", replyTo: "", subject: initial?.subject || "", html: initial?.html || "<p>Write your message here...</p>", text: initial?.text || "" });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const htmlRef = useRef(values.html);
  const [mode, setMode] = useState<"editor" | "source" | "preview">("editor");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (mode === "editor" && editorRef.current && editorRef.current.innerHTML !== htmlRef.current) editorRef.current.innerHTML = htmlRef.current;
  }, [mode]);

  function format(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    if (editorRef.current) htmlRef.current = editorRef.current.innerHTML;
  }

  function addLink() {
    const url = linkUrl.trim();
    if (url && /^https?:\/\//i.test(url)) format("createLink", url);
    setLinkUrl("");
    setLinkOpen(false);
  }

  async function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const available = 10 - attachments.length;
    const selected = files.slice(0, available);
    const encoded = await Promise.all(selected.map(async (file) => new Promise<Attachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ filename: file.name, contentType: file.type || "application/octet-stream", content: String(reader.result).split(",")[1] || "", size: file.size });
      reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
      reader.readAsDataURL(file);
    })));
    setAttachments((current) => [...current, ...encoded]);
    event.target.value = "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirm("Send this email now?")) return;
    setBusy(true); setMessage("");
    const payload = { ...values, html: mode === "editor" ? editorRef.current?.innerHTML || htmlRef.current : htmlRef.current, attachments: attachments.map(({ size, ...item }) => item) };
    const response = await fetch("/api/emails/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    setBusy(false);
    setMessage(response.ok ? `Accepted by Resend. Email ID: ${data.id}` : data.message || "Unable to send email.");
    if (response.ok) { setAttachments([]); setValues({ ...values, to: "", cc: "", bcc: "" }); }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block text-sm font-medium md:col-span-2">To<input required value={values.to} onChange={(e) => update("to", e.target.value)} placeholder="recipient@example.com, another@example.com" className="field mt-2" /></label>
      <label className="block text-sm font-medium">CC<input value={values.cc} onChange={(e) => update("cc", e.target.value)} placeholder="Optional" className="field mt-2" /></label>
      <label className="block text-sm font-medium">BCC<input value={values.bcc} onChange={(e) => update("bcc", e.target.value)} placeholder="Optional" className="field mt-2" /></label>
      <label className="block text-sm font-medium md:col-span-2">Reply-To<input value={values.replyTo} onChange={(e) => update("replyTo", e.target.value)} placeholder="Optional reply address" className="field mt-2" /></label>
      <label className="block text-sm font-medium md:col-span-2">Subject<input required value={values.subject} onChange={(e) => update("subject", e.target.value)} className="field mt-2" /></label>
    </div>
    <div className="rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-2">
        <div className="flex gap-1">
          <button type="button" onClick={() => format("bold")} className="tool" aria-label="Bold"><Bold size={16} /></button>
          <button type="button" onClick={() => format("italic")} className="tool" aria-label="Italic"><Italic size={16} /></button>
          <button type="button" onClick={() => format("insertUnorderedList")} className="tool" aria-label="Bulleted list"><List size={16} /></button>
          <button type="button" onClick={() => setLinkOpen(true)} className="tool" aria-label="Add link"><LinkIcon size={16} /></button>
          <button type="button" onClick={() => fileRef.current?.click()} className="tool" aria-label="Attach files"><Paperclip size={16} /></button>
          <input ref={fileRef} type="file" multiple onChange={addFiles} className="hidden" />
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
          <button type="button" onClick={() => setMode("editor")} className={`mode ${mode === "editor" ? "active" : ""}`}>Editor</button>
          <button type="button" onClick={() => { htmlRef.current = values.html; setMode("source"); }} className={`mode ${mode === "source" ? "active" : ""}`}><Code2 size={14} /> Source</button>
          <button type="button" onClick={() => setMode("preview")} className={`mode ${mode === "preview" ? "active" : ""}`}><Eye size={14} /> Preview</button>
        </div>
      </div>
      {mode === "editor" && <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={(e) => { htmlRef.current = e.currentTarget.innerHTML; }} className="min-h-64 p-5 outline-none" />}
      {mode === "source" && <textarea value={values.html} onChange={(e) => { htmlRef.current = e.target.value; update("html", e.target.value); }} className="min-h-64 w-full resize-y p-5 font-mono text-sm outline-none" />}
      {mode === "preview" && <iframe title="Email preview" sandbox="" srcDoc={htmlRef.current} className="h-72 w-full border-0 bg-white" />}
    </div>
    {linkOpen && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="flex flex-col gap-2 sm:flex-row"><input autoFocus required type="url" pattern="https://.*" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" className="field flex-1" /><button type="button" onClick={addLink} disabled={!/^https?:\/\//i.test(linkUrl.trim())} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Insert link</button><button type="button" onClick={() => setLinkOpen(false)} className="rounded-xl px-4 py-2 text-sm text-slate-600">Cancel</button></div></div>}
    {attachments.length > 0 && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-medium">Attachments</p><div className="mt-2 space-y-2">{attachments.map((file, index) => <div key={`${file.filename}-${index}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"><span className="truncate">{file.filename} <span className="text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span></span><button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="p-1 text-slate-400 hover:text-red-600" aria-label={`Remove ${file.filename}`}><X size={16} /></button></div>)}</div><p className="mt-2 text-xs text-slate-500">Up to 10 files, 10 MB each, 25 MB total.</p></div>}
    <label className="block text-sm font-medium">Plain-text alternative<textarea value={values.text} onChange={(e) => update("text", e.target.value)} placeholder="Optional plain-text version" className="field mt-2 min-h-24" /></label>
    {message && <p className={`rounded-xl px-4 py-3 text-sm ${message.startsWith("Accepted") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
    <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"><Send size={17} />{busy ? "Sending..." : "Send email"}</button>
  </form>;
}
