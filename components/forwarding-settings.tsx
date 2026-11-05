"use client";

import { useState } from "react";
import type { ForwardingSettings } from "@/lib/database";

export function ForwardingSettingsCard({ initial }: { initial: ForwardingSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/settings/forwarding", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: !settings.enabled }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update forwarding.");
      setSettings(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update forwarding."); }
    finally { setSaving(false); }
  }
  return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="font-semibold">Automatic inbound forwarding</h2><p className="mt-1 text-sm text-slate-500">Forward received messages with attachments preserved.</p></div>
      <button type="button" onClick={toggle} disabled={saving || settings.status === "not_configured"} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : settings.enabled ? "Disable" : "Enable"}</button>
    </div>
    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Source</dt><dd className="font-medium">{settings.source || "Not configured"}</dd></div><div><dt className="text-slate-500">Destination</dt><dd className="font-medium">{settings.destination || "Not configured"}</dd></div><div><dt className="text-slate-500">Status</dt><dd className="font-medium">{settings.status === "ready" && settings.enabled ? "Enabled" : settings.status === "disabled" ? "Disabled" : "Not configured"}</dd></div><div><dt className="text-slate-500">Last successful forward</dt><dd className="font-medium">{settings.last_forwarded_at ? new Date(settings.last_forwarded_at).toLocaleString() : "None yet"}</dd></div></dl>
    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
  </div>;
}
