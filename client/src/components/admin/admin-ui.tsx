import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {title}
          </h1>
          {badge ? (
            <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
              {badge}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-slate-500 sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminSurface({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.11),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,248,0.94))] shadow-[0_26px_80px_-52px_rgba(15,23,42,0.28)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "dark" | "sky" | "emerald";
}) {
  const toneClass =
    tone === "dark"
      ? "border-slate-900/12 bg-[linear-gradient(145deg,#111827,#1f2937)] text-white"
      : tone === "sky"
        ? "border-sky-200 bg-[linear-gradient(145deg,#eff6ff,#ffffff)]"
        : tone === "emerald"
          ? "border-emerald-200 bg-[linear-gradient(145deg,#ecfdf5,#ffffff)]"
          : "border-white/70 bg-[linear-gradient(145deg,#fff8f8,#ffffff)]";

  const valueClass = tone === "dark" ? "text-white" : "text-slate-950";
  const labelClass = tone === "dark" ? "text-white/64" : "text-slate-500";
  const hintClass = tone === "dark" ? "text-white/70" : "text-slate-500";
  const iconClass =
    tone === "dark"
      ? "border-white/14 bg-white/8 text-white"
      : "border-primary/15 bg-primary/8 text-primary";

  return (
    <div className={cn("rounded-[1.7rem] border p-5 shadow-[0_22px_50px_-40px_rgba(15,23,42,0.24)]", toneClass)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", labelClass)}>
            {label}
          </p>
          <p className={cn("mt-4 text-3xl font-semibold", valueClass)}>{value}</p>
        </div>
        {icon ? (
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-[1.1rem] border", iconClass)}>
            {icon}
          </div>
        ) : null}
      </div>
      {hint ? <p className={cn("mt-3 text-sm leading-6", hintClass)}>{hint}</p> : null}
    </div>
  );
}

export function AdminInfoPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/85 px-3.5 py-3 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.2)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
