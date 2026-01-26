import { cn } from "../lib/utils";

function fmtUnits(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return "";
  return x.toFixed(3).replace(/\.?0+$/, "");
}

export function OrderItemRow({
  item,
  disabled,
  onToggle,
  busy,
  showCheckbox = true,
}) {
  const ru = item.requested_units;
  const ruTxt = ru != null ? fmtUnits(ru) : "";

  const qty = String(item.amount).replace(/\.?0+$/, "");

  const Tag = showCheckbox ? "label" : "div";
  const clickable = showCheckbox && !disabled && !busy;

  return (
    <Tag
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3 transition select-none",
        disabled ? "opacity-60" : "hover:bg-slate-50",
        clickable ? "cursor-pointer" : "",
      )}
      dir="rtl"
    >
      {showCheckbox ? (
        <input
          type="checkbox"
          className="mt-1 h-6 w-6 accent-emerald-600"
          checked={Boolean(item.picked)}
          disabled={disabled || busy}
          onChange={(e) => onToggle(e.target.checked)}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="ms-auto whitespace-nowrap text-base font-extrabold text-slate-800">
            <span>{qty}</span>
            {item.unit ? (
              <span className="ms-1 text-xs font-bold text-slate-500">
                {item.unit}
              </span>
            ) : null}
          </div>

          <div
            className={cn(
              "min-w-0 flex-1 truncate text-right text-sm font-semibold",
              showCheckbox && item.picked
                ? "text-slate-500 line-through"
                : "text-slate-900",
            )}
          >
            {item.name}{" "}
            {ruTxt ? (
              <span className="text-xs font-semibold text-slate-500">
                ({ruTxt} יחידות)
              </span>
            ) : null}
          </div>
        </div>

        {item.notes ? (
          <div className="mt-1 text-xs text-slate-500 text-right">
            {item.notes}
          </div>
        ) : null}
      </div>
    </Tag>
  );
}
