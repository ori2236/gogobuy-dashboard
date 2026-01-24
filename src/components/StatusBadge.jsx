import { cn } from "../lib/utils";

export function StatusBadge({ status }) {
  const cfg =
    status === "confirmed"
      ? { label: "ממתין לליקוט", cls: "bg-amber-100 text-amber-800" }
      : status === "preparing"
      ? { label: "בליקוט", cls: "bg-sky-100 text-sky-800" }
      : status === "ready"
      ? { label: "מוכן", cls: "bg-emerald-100 text-emerald-800" }
      : { label: status, cls: "bg-slate-100 text-slate-700" };

  return <span className={cn("pill", cfg.cls)}>{cfg.label}</span>;
}
