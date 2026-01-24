import { useEffect } from "react";

export function Toast({ kind, message, onClose, ttlMs = 4000 }) {
  useEffect(() => {
    const t = setTimeout(onClose, ttlMs);
    return () => clearTimeout(t);
  }, [onClose, ttlMs]);

  const style =
    kind === "success"
      ? "bg-emerald-600 text-white"
      : kind === "error"
      ? "bg-rose-600 text-white"
      : "bg-slate-900 text-white";

  return (
    <div className={`fixed bottom-4 left-4 z-50 max-w-[92vw] rounded-2xl px-4 py-3 shadow-md ${style}`}>
      <div className="flex items-start gap-3">
        <div className="text-sm font-semibold">{message}</div>
        <button className="ms-auto text-white/80 hover:text-white" onClick={onClose} aria-label="סגור">
          ✕
        </button>
      </div>
    </div>
  );
}
