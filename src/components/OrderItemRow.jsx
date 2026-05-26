import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Save } from "lucide-react";
import { cn } from "../lib/utils";

function fmtUnits(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return "";
  return x.toFixed(3).replace(/\.?0+$/, "");
}

function fmtAmount(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return x.toFixed(3).replace(/\.?0+$/, "");
}

function asComparableText(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) ? fmtAmount(n) : s;
}

function hasDifferentSuppliedAmount(item) {
  if (
    item.supplied_amount === null ||
    item.supplied_amount === undefined ||
    item.supplied_amount === ""
  ) {
    return false;
  }
  const supplied = Number(item.supplied_amount);
  const requested = Number(item.amount);
  return (
    Number.isFinite(supplied) &&
    Number.isFinite(requested) &&
    Math.abs(supplied - requested) >= 0.0005
  );
}

export function OrderItemRow({
  item,
  disabled,
  onToggle,
  busy,
  showCheckbox = true,
  editableDetails = false,
  detailsOpen = false,
  onToggleDetails,
  detailsBusy = false,
  onSaveDetails,
}) {
  const ru = item.requested_units;
  const ruTxt = ru != null ? fmtUnits(ru) : "";
  const qty = fmtAmount(item.amount);
  const unit = item.unit || item.unit_label || "";
  const itemNote = item.picker_note ?? item.notes ?? "";
  const displayedSuppliedAmount =
    item.supplied_amount !== null &&
    item.supplied_amount !== undefined &&
    item.supplied_amount !== ""
      ? item.supplied_amount
      : item.amount;

  const [suppliedAmount, setSuppliedAmount] = useState(
    fmtAmount(displayedSuppliedAmount),
  );
  const [pickerNote, setPickerNote] = useState(itemNote || "");

  useEffect(() => {
    setSuppliedAmount(fmtAmount(displayedSuppliedAmount));
    setPickerNote(itemNote || "");
  }, [displayedSuppliedAmount, itemNote]);

  const changedSupplied = hasDifferentSuppliedAmount(item);
  const showPickerNote = Boolean(String(itemNote || "").trim());
  const hasReportDetails = changedSupplied || showPickerNote;

  const originalDetailState = useMemo(
    () => ({
      suppliedAmount: fmtAmount(displayedSuppliedAmount),
      pickerNote: String(itemNote || "").trim(),
    }),
    [displayedSuppliedAmount, itemNote],
  );

  async function saveDetailsIfNeeded() {
    if (!editableDetails || !onSaveDetails || detailsBusy) return;

    const nextAmount = asComparableText(suppliedAmount);
    const nextNote = String(pickerNote || "").trim();

    if (
      nextAmount === originalDetailState.suppliedAmount &&
      nextNote === originalDetailState.pickerNote
    ) {
      return;
    }

    await onSaveDetails({
      suppliedAmount: nextAmount === "" ? null : nextAmount,
      pickerNote: nextNote,
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3 transition select-none",
        disabled ? "opacity-70" : "hover:bg-slate-50",
      )}
      dir="rtl"
    >
      <div className="flex items-start gap-3">
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
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="whitespace-nowrap text-base font-extrabold text-slate-800">
                <span>{qty}</span>
                {unit ? (
                  <span className="ms-1 text-xs font-bold text-slate-500">
                    {unit}
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

            {editableDetails ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-left">
                {hasReportDetails && !detailsOpen ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-100">
                    יש פרטי דו״ח
                  </span>
                ) : null}

                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                  onClick={onToggleDetails}
                >
                  {detailsOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {detailsOpen
                    ? "סגור"
                    : hasReportDetails
                      ? "ערוך פרטי דו״ח"
                      : "הוסף הערה לדו״ח / כמות שסופקה"}
                </button>
              </div>
            ) : null}
          </div>

          {editableDetails && detailsOpen ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-[145px_1fr_auto] sm:items-end">
                <label className="grid gap-1 text-xs font-bold text-slate-600">
                  כמות שסופקה
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                      value={suppliedAmount}
                      onChange={(e) => setSuppliedAmount(e.target.value)}
                      onBlur={saveDetailsIfNeeded}
                      disabled={detailsBusy}
                      dir="ltr"
                    />
                    {unit ? <span className="text-xs text-slate-500">{unit}</span> : null}
                  </div>
                </label>

                <label className="grid gap-1 text-xs font-bold text-slate-600">
                  הערה לדו״ח
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                    value={pickerNote}
                    onChange={(e) => setPickerNote(e.target.value)}
                    onBlur={saveDetailsIfNeeded}
                    placeholder="לדוגמה: סופק טעם אחר / לא היה גודל מדויק"
                    disabled={detailsBusy}
                  />
                </label>

                <button
                  type="button"
                  className="btn-outline h-9 px-3 text-xs"
                  onClick={saveDetailsIfNeeded}
                  disabled={detailsBusy}
                >
                  <Save className="h-3.5 w-3.5" />
                  שמור
                </button>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-500">
                הפרטים האלה נשמרים לדו״ח PDF ולא נשלחים ללקוח.
              </div>
            </div>
          ) : null}

          {!editableDetails && (changedSupplied || showPickerNote) ? (
            <div className="mt-2 grid gap-1 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-right text-xs text-amber-950">
              {changedSupplied ? (
                <div>
                  <span className="font-extrabold">נדרש:</span> {qty} {unit}{" "}
                  <span className="mx-1 text-amber-700">|</span>
                  <span className="font-extrabold">סופק:</span>{" "}
                  {fmtAmount(item.supplied_amount)} {unit}
                </div>
              ) : null}
              {showPickerNote ? (
                <div className="whitespace-pre-wrap">
                  <span className="font-extrabold">הערה לדו״ח:</span> {itemNote}
                </div>
              ) : null}
            </div>
          ) : null}

          {detailsBusy ? (
            <div className="mt-1 text-[11px] font-semibold text-slate-500">
              שומר פרטי דו״ח…
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
