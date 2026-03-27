import { cn } from "@/lib/utils";

export default function MetricCard({
  label,
  value,
  hint,
  tone = "orange",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "orange" | "blue" | "green" | "slate";
  className?: string;
}) {
  const toneClass =
    tone === "blue"
      ? "from-sky-500/10 via-sky-500/5 to-white"
      : tone === "green"
        ? "from-emerald-500/10 via-emerald-500/5 to-white"
        : tone === "slate"
          ? "from-slate-500/10 via-slate-500/5 to-white"
          : "from-red-500/14 via-rose-500/6 to-white";

  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-white/60 bg-[linear-gradient(135deg,var(--tw-gradient-stops))] p-5 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.35)]",
        toneClass,
        className,
      )}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}
