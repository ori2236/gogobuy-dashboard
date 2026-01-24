import { useMemo, useState } from "react";
import { useOrders, useSetOrderStatus } from "./lib/hooks";
import { TopBar } from "./components/TopBar";
import { OrderCard } from "./components/OrderCard";
import { SkeletonCard } from "./components/Skeleton";
import { Toast } from "./components/Toast";

function sortOrders(orders) {
  const rank = (s) => (s === "preparing" ? 0 : s === "confirmed" ? 1 : 2);

  return [...orders].sort((a, b) => {
    const r = rank(a.status) - rank(b.status);
    if (r !== 0) return r;

    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;

    if (ta !== tb) return ta - tb;

    return (a.id ?? 0) - (b.id ?? 0);
  });
}

function loadPickedMap() {
  try {
    return JSON.parse(localStorage.getItem("picker_picked_map_v1") || "{}");
  } catch {
    return {};
  }
}

function savePickedMap(map) {
  localStorage.setItem("picker_picked_map_v1", JSON.stringify(map));
}

function loadNoteMap() {
  try {
    return JSON.parse(localStorage.getItem("picker_note_map_v1") || "{}");
  } catch {
    return {};
  }
}

function saveNoteMap(map) {
  localStorage.setItem("picker_note_map_v1", JSON.stringify(map));
}

export default function App() {
  const [toast, setToast] = useState(null);
  const [pickedMap, setPickedMap] = useState(loadPickedMap); // { [orderId]: { [orderItemId]: true } }
  const [noteMap, setNoteMap] = useState(loadNoteMap);

  const { data: orders, isLoading, isFetching, refetch, error } = useOrders();
  const setStatus = useSetOrderStatus();

  const notify = (kind, message) => setToast({ kind, message });

  const normalized = useMemo(() => {
    const list = sortOrders(orders ?? []);
    // inject local picked into items
    return list.map((o) => {
      const perOrder = pickedMap[o.id] || {};
      return {
        ...o,
        items: (o.items || []).map((it) => ({
          ...it,
          picked: Boolean(perOrder[it.id]),
        })),
      };
    });
  }, [orders, pickedMap]);

  const confirmedCount = normalized.filter(
    (o) => o.status === "confirmed",
  ).length;
  const preparingCount = normalized.filter(
    (o) => o.status === "preparing",
  ).length;

  const busyOrderId = setStatus.isPending
    ? (setStatus.variables?.orderId ?? null)
    : null;

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
      const pickerNote = (noteMap[order.id] || "").trim();
      
      await setStatus.mutateAsync({
        orderId: order.id,
        status: "ready",
        pickerNote,
      });

      setPickedMap((prev) => {
        const next = { ...prev };
        delete next[order.id];
        savePickedMap(next);
        return next;
      });

      notify("success", `הזמנה #${order.id} סומנה כמוכנה`);
    } catch (e) {
      notify("error", e?.message || "שגיאה בסימון הזמנה כמוכנה");
    }
  }

  async function onToggleItem(order, orderItemId, picked) {
    setPickedMap((prev) => {
      const next = { ...prev };
      const perOrder = { ...(next[order.id] || {}) };
      if (picked) perOrder[orderItemId] = true;
      else delete perOrder[orderItemId];
      next[order.id] = perOrder;
      savePickedMap(next);
      return next;
    });

    try {
      if (picked && order.status === "confirmed") {
        await setStatus.mutateAsync({ orderId: order.id, status: "preparing" });
      }
    } catch (e) {
      notify("error", e?.message || "שגיאה בעדכון סטטוס");
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
            <div className="font-extrabold">שגיאה בטעינת הזמנות</div>
            <div className="mt-1">{String(error.message || "")}</div>

            {error.details ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold">
                  פרטים טכניים
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-rose-100 bg-white p-3 text-[11px] leading-5 text-slate-800">
                  {String(error.details)}
                </pre>
              </details>
            ) : null}

            <div className="mt-3">
              <button className="btn-outline" onClick={() => refetch()}>
                נסה שוב
              </button>
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
                busyItemId={null}
                onStartPicking={() => onStartPicking(order)}
                onMarkReady={() => onMarkReady(order)}
                onToggleItem={(orderItemId, picked) =>
                  onToggleItem(order, orderItemId, picked)
                }
                pickerNote={noteMap[order.id] || ""}
                onChangeNote={(txt) => {
                  setNoteMap((prev) => {
                    const next = { ...prev, [order.id]: txt };
                    saveNoteMap(next);
                    return next;
                  });
                }}
              />
            ))
          ) : (
            <div className="card p-8 text-center">
              <div className="text-lg font-extrabold">
                אין הזמנות לליקוט כרגע
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 text-center text-xs text-slate-500">
          powered by{" "}
          <span className="font-semibold text-slate-700">gogobuy.ai</span>
        </div>
      </div>

      {toast ? (
        <Toast
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
