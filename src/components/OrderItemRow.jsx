import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
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
  const isGift = Boolean(item.is_gift);
  const linePrice = Number(item.line_price);
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
  const [saveState, setSaveState] = useState("idle");

  useEffect(() => {
    setSuppliedAmount(fmtAmount(displayedSuppliedAmount));
    setPickerNote(itemNote || "");
    setSaveState("idle");
  }, [displayedSuppliedAmount, itemNote]);

  const changedSupplied = hasDifferentSuppliedAmount(item);
  const showPickerNote = Boolean(String(itemNote || "").trim());
  const hasReportDetails = changedSupplied || showPickerNote;
  const amountStep = item.sold_by_weight ? "0.1" : "1";

  const originalDetailState = useMemo(
    () => ({
      suppliedAmount: fmtAmount(displayedSuppliedAmount),
      pickerNote: String(itemNote || "").trim(),
    }),
    [displayedSuppliedAmount, itemNote],
  );

  function detailsChanged() {
    const nextAmount = asComparableText(suppliedAmount);
    const nextNote = String(pickerNote || "").trim();

    return (
      nextAmount !== originalDetailState.suppliedAmount ||
      nextNote !== originalDetailState.pickerNote
    );
  }

  async function saveDetailsIfNeeded() {
    if (!editableDetails || !onSaveDetails || detailsBusy) return;

    const nextAmount = asComparableText(suppliedAmount);
    const nextNote = String(pickerNote || "").trim();

    if (
      nextAmount === originalDetailState.suppliedAmount &&
      nextNote === originalDetailState.pickerNote
    ) {
      setSaveState("idle");
      return;
    }

    try {
      setSaveState("saving");
      await onSaveDetails({
        suppliedAmount: nextAmount === "" ? null : nextAmount,
        pickerNote: nextNote,
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function handleSaveDetails() {
    await saveDetailsIfNeeded();
  }


  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3 font-sans transition select-none",
        isGift
          ? "border-emerald-100 bg-emerald-50/70"
          : "border-slate-100 bg-slate-50/60",
        disabled ? "opacity-70" : isGift ? "hover:bg-emerald-50" : "hover:bg-slate-50",
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
                {isGift ? (
                  <span className="me-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                    מתנה 🎁
                  </span>
                ) : null}
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
              <div className="grid gap-3 sm:grid-cols-[155px_1fr_120px] sm:items-end">
                <label className="grid gap-1 text-xs font-bold text-slate-600">
                  כמות שסופקה
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm focus-within:border-slate-900">
                    <input
                      type="number"
                      min="0"
                      step={amountStep}
                      inputMode="decimal"
                      className="w-full border-0 bg-transparent px-1 py-1 text-sm font-semibold text-slate-900 outline-none"
                      value={suppliedAmount}
                      onChange={(e) => { setSuppliedAmount(e.target.value); setSaveState("idle"); }}
                      disabled={detailsBusy}
                      dir="ltr"
                    />
                    {unit ? <span className="shrink-0 text-xs font-semibold text-slate-500">{unit}</span> : null}
                  </div>
                </label>

                <label className="grid gap-1 text-xs font-bold text-slate-600">
                  הערה לדו״ח
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:border-slate-900"
                    value={pickerNote}
                    onChange={(e) => { setPickerNote(e.target.value); setSaveState("idle"); }}
                    placeholder="לדוגמה: סופק טעם אחר / לא היה גודל מדויק"
                    disabled={detailsBusy}
                  />
                </label>

                <div className="grid gap-1 text-right text-[11px] font-bold text-slate-500 sm:text-center">
                  <button
                    type="button"
                    className="btn-success h-9 px-3 py-1 text-xs shadow-sm"
                    disabled={detailsBusy || saveState === "saving" || !detailsChanged()}
                    onClick={handleSaveDetails}
                  >
                    {detailsBusy || saveState === "saving" ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : null}
                    שמור
                  </button>

                  {detailsChanged() ? (
                    <span className="inline-flex justify-center rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                      לא נשמר
                    </span>
                  ) : saveState === "saved" ? (
                    <span className="inline-flex justify-center rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      נשמר
                    </span>
                  ) : saveState === "error" ? (
                    <span className="inline-flex justify-center rounded-full bg-rose-50 px-2 py-1 text-rose-700">
                      שגיאת שמירה
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-500">
                הפרטים נשמרים לדו״ח PDF ולא נשלחים ללקוח. אחרי שינוי לחץ שמור.
              </div>
            </div>
          ) : null}

          {isGift ? (
            <div className="mt-2 rounded-xl border border-emerald-100 bg-white/70 px-3 py-2 text-right text-xs font-bold text-emerald-900">
              מוצר מתנה ממבצע סל - צריך להילקט כמו כל מוצר אחר.
            </div>
          ) : Number.isFinite(linePrice) ? (
            <div className="mt-2 text-right text-[11px] font-semibold text-slate-500">
              מחיר שורה אחרי מבצעים: ₪{linePrice.toFixed(2)}
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

          {detailsBusy && saveState !== "saving" ? (
            <div className="mt-1 text-[11px] font-semibold text-slate-500">
              שומר פרטי דו״ח…
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
