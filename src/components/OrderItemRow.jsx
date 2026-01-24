import { CheckCircle2, Circle } from "lucide-react";
import { cn, formatQty } from "../lib/utils";

export function OrderItemRow({ item, disabled, onToggle, busy }) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3 transition",
        item.picked ? "opacity-80" : "hover:bg-slate-50"
      )}
    >
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 accent-emerald-600"
        checked={item.picked}
        disabled={disabled || busy}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {item.picked ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Circle className="h-4 w-4 text-slate-400" />
          )}
          <div className="truncate text-sm font-semibold">{item.name}</div>
          <div className="ms-auto whitespace-nowrap text-xs font-semibold text-slate-600">
            {formatQty(item.amount, item.unit ?? undefined)}
          </div>
        </div>
        {item.notes ? <div className="mt-1 text-xs text-slate-500">{item.notes}</div> : null}
      </div>
    </label>
  );
}
