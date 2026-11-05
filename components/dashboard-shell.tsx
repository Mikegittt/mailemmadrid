"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, MailPlus, Send, Inbox, FileText, Settings, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  ["/dashboard", "Overview", LayoutDashboard], ["/compose", "Compose email", MailPlus],
  ["/sent", "Sent emails", Send], ["/inbox", "Inbox", Inbox], ["/templates", "Templates", FileText], ["/settings", "Settings", Settings],
] as const;
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }
  return <div className="app-shell min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
      <div className="flex items-center gap-3"><button className="rounded-lg p-2 hover:bg-slate-100 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X size={20} /> : <Menu size={20} />}</button><Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">E</span>EMMADRID <span className="hidden text-slate-400 sm:inline">MAIL CENTER</span></Link></div>
      <button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"><LogOut size={16} /> <span className="hidden sm:inline">Log out</span></button>
    </header>
    <div className="mx-auto flex max-w-[1440px]">
      {open && <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 top-[calc(4rem+env(safe-area-inset-top))] z-10 bg-slate-900/20 md:hidden" />}
      <aside className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-20 max-h-[calc(100svh-4rem-env(safe-area-inset-top))] overflow-y-auto border-b border-slate-200 bg-white p-4 shadow-lg md:relative md:inset-auto md:z-auto md:block md:min-h-[calc(100vh-4rem)] md:max-h-none md:w-64 md:border-b-0 md:border-r md:shadow-none`}>
        <nav className="space-y-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${pathname === href ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={18} />{label}</Link>)}</nav>
        <div className="mt-8 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><p className="font-semibold text-slate-700">Private workspace</p><p className="mt-1">Messages are sent using your configured Resend identity.</p></div>
      </aside>
      <main className="min-w-0 flex-1 p-4 pb-8 md:p-8">{children}</main>
    </div>
  </div>;
}
