import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

export function ConfirmDeleteModal({
  open,
  busy,
  title,
  text,
  hint,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="p-6" dir="rtl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1 text-right">
              <div className="text-xl font-extrabold leading-tight">
                {title || "מחיקה"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                פעולה זו אינה הפיכה.
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-200 p-4">
            <div className="rounded-2xl bg-white p-4 text-right">
              <div className="text-sm font-semibold text-slate-900">
                {text || "האם למחוק?"}
              </div>
              {hint ? (
                <div className="mt-2 text-xs text-slate-500">{hint}</div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-outline" onClick={onCancel} disabled={busy}>
              ביטול
            </button>

            <button className="btn-success" onClick={onConfirm} disabled={busy}>
              {busy ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              כן, למחוק
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
