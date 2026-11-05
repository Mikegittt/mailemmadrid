"use client";
import { FormEvent, useState } from "react";
import { LockKeyhole, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", "cache-control": "no-cache" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message || "Unable to sign in");
        return;
      }
      // A full navigation makes Safari/iOS re-read the Set-Cookie session before rendering the protected route.
      window.location.assign("/dashboard");
    } catch {
      setError("Unable to sign in. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2"><div className="hidden bg-blue-600 p-10 text-white md:block"><div className="flex h-full flex-col justify-between"><div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 font-semibold">E</div><h1 className="mt-12 text-4xl font-semibold leading-tight">Your email,<br />under control.</h1><p className="mt-5 max-w-xs text-blue-100">A focused workspace for sending and tracking important messages.</p></div><div className="flex items-center gap-2 text-sm text-blue-100"><ShieldCheck size={18} /> Private administrator workspace</div></div></div><div className="p-7 sm:p-12"><div className="mb-10 md:hidden"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-semibold text-white">E</div></div><p className="text-sm font-medium text-blue-600">EMMADRID MAIL CENTER</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back</h2><p className="mt-2 text-sm text-slate-500">Sign in to access your sending workspace.</p><form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm font-medium text-slate-700">Administrator password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none ring-blue-500 focus:ring-2" placeholder="Enter your password" /></label>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">{busy ? "Signing in..." : "Sign in"} {!busy && <ArrowRight size={17} />}</button></form><p className="mt-8 flex items-center gap-2 text-xs text-slate-400"><LockKeyhole size={14} /> Protected with an encrypted session</p></div></div></main>;
}
