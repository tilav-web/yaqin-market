import { cn } from "@/lib/utils";
import { getStatusTone } from "@/lib/market";

export default function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        getStatusTone(status),
        className,
      )}
    >
      {label ?? status}
    </span>
  );
}
