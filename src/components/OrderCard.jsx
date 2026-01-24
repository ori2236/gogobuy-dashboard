import { PackageCheck, Play, RefreshCw, Send, ShoppingBasket } from "lucide-react";
import { cn, formatDateTime } from "../lib/utils";
import { allPicked, canMarkReady, pickedCount, progressPct } from "../lib/hooks";
import { StatusBadge } from "./StatusBadge";
import { OrderItemRow } from "./OrderItemRow";

export function OrderCard({
  order,
  busyOrderId,
  busyItemId,
  onStartPicking,
  onMarkReady,
  onToggleItem,
}) {
  const busy = busyOrderId === order.id;
  const pct = progressPct(order);
  const picked = pickedCount(order);
  const total = order.items.length;
  const isPreparing = order.status === "preparing";
  const isConfirmed = order.status === "confirmed";
  const isReady = order.status === "ready";

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-slate-700" />
            <div className="text-base font-bold">הזמנה #{order.id}</div>
          </div>

          <StatusBadge status={order.status} />

          <div className="ms-auto flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
            {order.customer_name ? <span className="pill bg-slate-100 text-slate-700">{order.customer_name}</span> : null}
            {order.customer_phone ? <span className="pill bg-slate-100 text-slate-700">{order.customer_phone}</span> : null}
            {order.created_at ? <span className="pill bg-slate-100 text-slate-700">{formatDateTime(order.created_at)}</span> : null}
          </div>
        </div>

        {order.customer_notes ? (
          <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-semibold">הערת לקוח:</span> {order.customer_notes}
          </div>
        ) : null}

        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-600">{picked}/{total} לוקטו</div>
            <div className="ms-auto text-xs font-semibold text-slate-600">{pct}%</div>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          {order.items.length ? (
            order.items.map((item) => (
              <OrderItemRow
                key={item.id}
                item={item}
                disabled={isReady}
                busy={busyItemId === item.id}
                onToggle={(picked) => onToggleItem(item.id, picked)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">אין מוצרים להזמנה הזו</div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className={cn((isPreparing || isReady) ? "btn-outline" : "btn-primary", "w-full sm:w-auto")}
            onClick={onStartPicking}
            disabled={busy || isPreparing || isReady || !isConfirmed}
          >
            {busy && isConfirmed ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isPreparing ? "הליקוט התחיל" : "התחל ליקוט"}
          </button>

          <button
            className={cn(canMarkReady(order) ? "btn-success" : "btn-secondary", "w-full sm:w-auto")}
            onClick={onMarkReady}
            disabled={busy || !canMarkReady(order) || isReady}
            title={!canMarkReady(order) ? "כדי לסיים, צריך להיות בסטטוס 'בליקוט' ולסמן את כל המוצרים" : "סמן הזמנה כמוכנה"}
          >
            {busy && canMarkReady(order) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            הזמנה מוכנה
          </button>

          <div className="ms-auto flex items-center gap-2 text-xs font-semibold text-slate-600">
            {allPicked(order) ? (
              <span className="pill bg-emerald-100 text-emerald-800">
                <PackageCheck className="h-3.5 w-3.5" />
                כל המוצרים לוקטו
              </span>
            ) : (
              <span className="pill bg-slate-100 text-slate-700">
                <PackageCheck className="h-3.5 w-3.5" />
                המשך לסמן ליקוט
              </span>
            )}
          </div>
        </div>
      </div>

      {isConfirmed ? (
        <div className="border-t border-slate-100 bg-gradient-to-l from-slate-50 to-white px-5 py-3 text-xs text-slate-600">
          ברגע שמתחילים ליקוט (או שמסמנים מוצר כלוקט), ההזמנה עוברת ל־<span className="font-semibold">בליקוט</span> ולא ניתן יותר לערוך/לבטל.
        </div>
      ) : null}
    </div>
  );
}
