import { RefreshCw, Send, ShoppingBasket, PackageCheck } from "lucide-react";
import { cn, formatDateTime } from "../lib/utils";
import {
  allPicked,
  canMarkReady,
  pickedCount,
  progressPct,
} from "../lib/hooks";
import { StatusBadge } from "./StatusBadge";
import { OrderItemRow } from "./OrderItemRow";

export function OrderCard({
  order,
  busyOrderId,
  busyItemId,
  onMarkReady,
  onToggleItem,
  pickerNote,
  onChangeNote,
}) {
  const busy = busyOrderId === order.id;

  const pct = progressPct(order);
  const picked = pickedCount(order);
  const total = order.items.length;

  const isPreparing = order.status === "preparing";
  const isConfirmed = order.status === "confirmed";
  const isReady = order.status === "ready";

  const name = (order.customer_name || "").trim();
  const phone = (order.customer_phone || "").trim();
  const showName = Boolean(name) && name !== phone;

  return (
    <div className="card overflow-hidden">
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-slate-700" />
            <div className="text-base font-bold">הזמנה #{order.id}</div>
          </div>

          <StatusBadge status={order.status} />

          <div className="ms-auto flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            {showName ? (
              <span className="pill bg-slate-100 text-slate-700">{name}</span>
            ) : null}
            {phone ? (
              <span className="pill bg-slate-100 text-slate-700">{phone}</span>
            ) : null}
            {order.created_at ? (
              <span className="pill bg-slate-100 text-slate-700">
                {formatDateTime(order.created_at)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-600">
              {picked}/{total} לוקטו
            </div>
            <div className="ms-auto text-xs font-semibold text-slate-600">
              {pct}%
            </div>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {(() => {
          const scroll = order.items.length > 4;

          return (
            <div
              className={cn(
                "mt-5",
                scroll && "max-h-[210px] overflow-y-auto pe-1",
              )}
            >
              <div className="grid gap-2">
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
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 text-right">
                    אין מוצרים להזמנה הזו
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div className="mt-5">
          <div className="mb-2 text-xs font-bold text-slate-700 text-right">
            הודעת מלקט ללקוח{" "}
            <span className="text-slate-500 font-medium">(אופציונלי)</span>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <button
              className={cn(
                canMarkReady(order) ? "btn-success" : "btn-secondary",
                "w-full sm:w-[170px] sm:shrink-0",
              )}
              onClick={onMarkReady}
              disabled={busy || !canMarkReady(order) || isReady}
              title={
                !canMarkReady(order)
                  ? "אפשר רק אחרי שכל המוצרים מסומנים ובסטטוס 'בליקוט'"
                  : ""
              }
            >
              {busy ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              הזמנה מוכנה
            </button>

            <textarea
              className="w-full flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-900 text-right"
              rows={2}
              value={pickerNote || ""}
              onChange={(e) => onChangeNote(e.target.value)}
              placeholder="לדוגמה: שמתי את המוצרים בקירור בשקית נפרדת"
            />
          </div>

          <div className="mt-1 text-[11px] text-slate-500 text-right">
            ההודעה תצורף להודעת “ההזמנה מוכנה”.
          </div>
        </div>
      </div>
    </div>
  );
}
