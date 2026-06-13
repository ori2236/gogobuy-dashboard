import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn, formatDateTime } from "../lib/utils";

function normalizePackagingCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(999, Math.floor(n)));
}

function PackagingCounter({ label, emoji, value, onChange, disabled }) {
  const safeValue = normalizePackagingCount(value);

  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-slate-200 px-2 py-1.5 shadow-sm">
      <span className="text-xs font-bold text-slate-800">{label}</span>
      <span className="text-sm leading-none">{emoji}</span>

      <div className="me-0.5 flex items-center gap-1" dir="ltr">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          onClick={() => onChange?.(Math.max(0, safeValue - 1))}
          disabled={disabled || safeValue <= 0}
          aria-label={`הפחת ${label}`}
        >
          −
        </button>

        <input
          type="number"
          min="0"
          max="999"
          step="1"
          inputMode="numeric"
          className="packaging-number-input h-7 w-11 rounded-xl border border-slate-300 bg-white text-center text-sm font-extrabold text-slate-900 outline-none focus:border-slate-900"
          value={safeValue}
          onChange={(e) => onChange?.(normalizePackagingCount(e.target.value))}
          disabled={disabled}
        />

        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          onClick={() => onChange?.(Math.min(999, safeValue + 1))}
          disabled={disabled || safeValue >= 999}
          aria-label={`הוסף ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ConfirmReadyModal({
  open,
  order,
  note,
  packagingBagsCount = 0,
  packagingCartonsCount = 0,
  busy,
  onCancel,
  onConfirm,
  onChangeNote,
  onChangePackaging,
}) {
  if (!open || !order) return null;

  const name = (order.customer_name || "").trim();
  const phone = (order.customer_phone || "").trim();
  const showName = Boolean(name) && name !== phone;

  const items = order.items || [];
  const scrollItems = items.length > 4;
  const customerNoteToPicker = (order.customer_note_to_picker || "").trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1 text-right" dir="rtl">
              <div className="text-xl font-extrabold leading-tight">
                לסמן הזמנה כמוכנה?
              </div>
              <div className="mt-1 text-sm text-slate-600">
                אחרי המעבר ל״מוכנה״ אי אפשר להתחרט.
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-200 p-4">
            <div className="flex items-center justify-between gap-3" dir="ltr">
              <div className="text-sm font-extrabold text-slate-900">
                הזמנה #{order.id}
              </div>

              <div
                className="flex flex-wrap items-center justify-end gap-2"
                dir="rtl"
              >
                {showName ? (
                  <span className="pill bg-white text-slate-700">
                    {name}
                  </span>
                ) : null}
                {phone ? (
                  <span className="pill bg-white text-slate-700">
                    {phone}
                  </span>
                ) : null}
                {order.created_at ? (
                  <span className="pill bg-white text-slate-700">
                    {formatDateTime(order.created_at)}
                  </span>
                ) : null}
              </div>
            </div>

            {customerNoteToPicker ? (
              <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-right" dir="rtl">
                <div className="text-xs font-extrabold text-amber-900">הודעה מהלקוח למלקט</div>
                <div className="mt-2 whitespace-pre-wrap text-sm font-semibold text-amber-950">
                  {customerNoteToPicker}
                </div>
              </div>
            ) : null}

            <div
              className={cn(
                "mt-4 rounded-2xl bg-slate-200",
                scrollItems && "max-h-[240px] overflow-y-auto pe-1",
              )}
              dir="rtl"
            >
              <div className="mt-3 grid gap-2">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-end gap-3 rounded-2xl bg-white px-3 py-3"
                  >
                    <div className="whitespace-nowrap text-sm font-extrabold text-slate-800">
                      <span>
                        {Number(it.amount)
                          .toFixed(3)
                          .replace(/\.?0+$/, "")}
                      </span>
                      {it.unit ? (
                        <span className="ms-1 text-xs font-bold text-slate-500">
                          {it.unit}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 text-right text-sm font-semibold text-slate-900">
                      <div className="truncate">{it.name}</div>
                      {(it.supplied_amount !== null && it.supplied_amount !== undefined && Number(it.supplied_amount) !== Number(it.amount)) || it.picker_note ? (
                        <div className="mt-1 text-xs font-semibold text-amber-800">
                          {it.supplied_amount !== null && it.supplied_amount !== undefined && Number(it.supplied_amount) !== Number(it.amount) ? (
                            <span>סופק בפועל: {Number(it.supplied_amount).toFixed(3).replace(/\.?0+$/, "")} {it.unit || ""}</span>
                          ) : null}
                          {it.picker_note ? (
                            <span className="block whitespace-pre-wrap">הערה: {it.picker_note}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl text-right" dir="rtl">
              <div className="text-xs font-bold text-slate-700">
                הערת מלקט ללקוח (אופציונלי)
              </div>

              <textarea
                className="mt-2 w-full rounded-2xl bg-white px-3 py-1 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-900 text-right"
                rows={2}
                value={note || ""}
                onChange={(e) => onChangeNote?.(e.target.value)}
                placeholder="לדוגמה: שמתי את המוצרים בקירור בשקית נפרדת"
                disabled={busy}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-center gap-2" dir="rtl">
              <PackagingCounter
                label="שקיות"
                emoji="🛍️"
                value={packagingBagsCount}
                disabled={busy}
                onChange={(value) => onChangePackaging?.("bags", value)}
              />
              <PackagingCounter
                label="קרטונים"
                emoji="📦"
                value={packagingCartonsCount}
                disabled={busy}
                onChange={(value) => onChangePackaging?.("cartons", value)}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="btn-outline" onClick={onCancel} disabled={busy}>
                ביטול
              </button>

              <button className="btn-success" onClick={onConfirm} disabled={busy}>
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                כן, לסמן כמוכנה
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
