export function StatCard({ label, value, detail, accent = "blue" }: { label: string; value: string | number; detail: string; accent?: "blue" | "green" | "red" | "slate" }) {
  const colors = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", red: "bg-red-50 text-red-700", slate: "bg-slate-100 text-slate-700" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><span className={`mt-3 inline-flex rounded-full px-2 py-1 text-xs font-medium ${colors[accent]}`}>{detail}</span></div>;
}
