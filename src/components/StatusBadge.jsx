import { cn } from "../lib/utils";

export function StatusBadge({ status, fulfillmentMethod }) {
  const isDelivery = String(fulfillmentMethod || "") === "delivery";

  const cfg =
    status === "confirmed"
      ? { label: "ממתין לליקוט", cls: "bg-amber-100 text-amber-800" }
      : status === "preparing"
        ? { label: "בליקוט", cls: "bg-sky-100 text-sky-800" }
        : status === "ready"
          ? {
              label: isDelivery ? "מחכה להישלח" : "מוכן לאיסוף",
              cls: "bg-emerald-100 text-emerald-800",
            }
          : status === "delivering"
            ? { label: "נשלחה", cls: "bg-blue-600 text-white ring-1 ring-blue-700" }
            : status === "completed"
              ? {
                  label: isDelivery ? "נמסרה" : "נאספה",
                  cls: "bg-slate-200 text-slate-800",
                }
              : { label: status, cls: "bg-slate-100 text-slate-700" };

  return <span className={cn("pill", cfg.cls)}>{cfg.label}</span>;
}
