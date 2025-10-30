import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function MetricCard({
  label,
  value,
  delta = 0,            // % change vs prior period
  hint,
  intent = "default",   // "ok" | "warn" | "bad" | "info" | "default"
  icon: Icon,
  footer,               // optional node
  loading = false,
}) {
  const intents = {
    ok:   "bg-emerald-900/20 border-emerald-800/50",
    bad:  "bg-rose-900/20 border-rose-800/50",
    warn: "bg-amber-900/20 border-amber-800/50",
    info: "bg-sky-900/20 border-sky-800/50",
    default: "bg-zinc-900/50 border-zinc-800/60",
  };

  if (loading) {
    return <div className={`rounded-2xl border p-4 md:p-5 ${intents[intent]}`}>
      <div className="h-14 animate-pulse rounded-md bg-zinc-800/40" />
    </div>;
  }

  const DeltaIcon = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  const deltaColor = delta >= 0 ? "text-emerald-400" : "text-rose-400";

  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${intents[intent]}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
        {Icon && <Icon className="size-4 text-zinc-400" />}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className="text-2xl font-semibold text-zinc-100 tabular-nums">{value}</div>
        <div className={`flex items-center text-xs ${deltaColor}`}>
          <DeltaIcon className="mr-1 size-3.5" />
          {Math.abs(Number(delta) || 0)}%
        </div>
      </div>
      {hint && <div className="mt-1 text-xs text-zinc-400">{hint}</div>}
      {footer}
    </div>
  );
}
