import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-[0_20px_60px_-48px_rgba(15,23,42,0.25)]">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="mt-5 inline-flex">
          <Button>{actionLabel}</Button>
        </Link>
      ) : null}
    </div>
  );
}
