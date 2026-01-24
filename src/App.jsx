import { useMemo, useState } from "react";
import { useOrders, useSetItemPicked, useSetOrderStatus } from "./lib/hooks";
import { TopBar } from "./components/TopBar";
import { OrderCard } from "./components/OrderCard";
import { SkeletonCard } from "./components/Skeleton";
import { Toast } from "./components/Toast";

function sortOrders(orders) {
  const rank = (s) => (s === "confirmed" ? 0 : s === "preparing" ? 1 : 2);
  return [...orders].sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
}

export default function App() {
  const [toast, setToast] = useState(null);
  const { data: orders, isLoading, isFetching, refetch, error } = useOrders();
  const setStatus = useSetOrderStatus();
  const setPicked = useSetItemPicked();

  const normalized = useMemo(() => sortOrders(orders ?? []), [orders]);
  const confirmedCount = normalized.filter((o) => o.status === "confirmed").length;
  const preparingCount = normalized.filter((o) => o.status === "preparing").length;

  const busyOrderId = setStatus.variables?.orderId ?? null;
  const busyItemId = setPicked.variables?.orderItemId ?? null;

  const notify = (kind, message) => setToast({ kind, message });

  async function ensurePreparing(order) {
    if (order.status !== "confirmed") return;
    await setStatus.mutateAsync({ orderId: order.id, status: "preparing" });
  }

  async function onStartPicking(order) {
    try {
      if (order.status !== "confirmed") return;
      await setStatus.mutateAsync({ orderId: order.id, status: "preparing" });
      notify("success", `התחלת ליקוט להזמנה #${order.id}`);
    } catch (e) {
      notify("error", e?.message || "שגיאה בהתחלת ליקוט");
    }
  }

  async function onMarkReady(order) {
    try {
      if (order.status !== "preparing") return;
      await setStatus.mutateAsync({ orderId: order.id, status: "ready" });
      notify("success", `הזמנה #${order.id} סומנה כמוכנה`);
    } catch (e) {
      notify("error", e?.message || "שגיאה בסימון הזמנה כמוכנה");
    }
  }

  async function onToggleItem(order, orderItemId, picked) {
    try {
      if (picked && order.status === "confirmed") {
        await ensurePreparing(order); // אוטומטי confirmed -> preparing
      }
      await setPicked.mutateAsync({ orderItemId, picked });
    } catch (e) {
      notify("error", e?.message || "שגיאה בעדכון מוצר");
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <TopBar
          confirmedCount={confirmedCount}
          preparingCount={preparingCount}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
            לא הצלחתי להביא הזמנות. {String(error?.message ?? "")}
            <div className="mt-3">
              <button className="btn-outline" onClick={() => refetch()}>נסה שוב</button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-5">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : normalized.length ? (
            normalized.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                busyOrderId={busyOrderId}
                busyItemId={busyItemId}
                onStartPicking={() => onStartPicking(order)}
                onMarkReady={() => onMarkReady(order)}
                onToggleItem={(orderItemId, picked) => onToggleItem(order, orderItemId, picked)}
              />
            ))
          ) : (
            <div className="card p-8 text-center">
              <div className="text-lg font-extrabold">אין הזמנות לליקוט כרגע</div>
              <div className="mt-1 text-sm text-slate-600">המסך יתעדכן אוטומטית כל כמה שניות.</div>
              <div className="mt-5">
                <button className="btn-outline" onClick={() => refetch()}>רענן ידנית</button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 text-center text-xs text-slate-500">
          טיפ: אפשר להשאיר את הטאב פתוח. רענון אוטומטי:{" "}
          <span className="kbd">{Number(import.meta.env.VITE_REFRESH_MS || "10000") / 1000}s</span>
        </div>
      </div>

      {toast ? <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
