import { useMemo, useState } from "react";
import { useOrders, useSetOrderStatus } from "./lib/hooks";
import { TopBar } from "./components/TopBar";
import { OrderCard } from "./components/OrderCard";
import { SkeletonCard } from "./components/Skeleton";
import { Toast } from "./components/Toast";
import { ConfirmReadyModal } from "./components/ConfirmReadyModal";

function sortOrders(orders) {
  const rank = (s) =>
    s === "preparing"
      ? 0
      : s === "confirmed"
        ? 1
        : s === "ready"
          ? 2
          : s === "completed"
            ? 3
            : 9;

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
  const [pickedMap, setPickedMap] = useState(loadPickedMap);
  const [noteMap, setNoteMap] = useState(loadNoteMap);
  const [confirm, setConfirm] = useState({ open: false, order: null });
  const [activeTab, setActiveTab] = useState("pending");

  const ALL_STATUSES = ["confirmed", "preparing", "ready", "completed"];
  const {
    data: orders,
    isLoading,
    isFetching,
    refetch,
    error,
  } = useOrders(ALL_STATUSES);
  const setStatus = useSetOrderStatus();

  const notify = (kind, message) => setToast({ kind, message });

  const normalized = useMemo(() => {
    const list = sortOrders(orders ?? []);
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

  const counts = useMemo(() => {
    const list = normalized ?? [];
    return {
      pending: list.filter(
        (o) => o.status === "confirmed" || o.status === "preparing",
      ).length,
      ready: list.filter((o) => o.status === "ready").length,
      completed: list.filter((o) => o.status === "completed").length,
    };
  }, [normalized]);

  const visibleOrders = useMemo(() => {
    if (activeTab === "stock") return [];
    if (activeTab === "pending")
      return normalized.filter(
        (o) => o.status === "confirmed" || o.status === "preparing",
      );
    if (activeTab === "ready")
      return normalized.filter((o) => o.status === "ready");
    if (activeTab === "completed")
      return normalized.filter((o) => o.status === "completed");
    return normalized;
  }, [normalized, activeTab]);

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

  function requestMarkReady(order) {
    if (order.status !== "preparing") return;
    const note = (noteMap[order.id] ?? order.picker_note ?? "").trim();
    setConfirm({ open: true, order: { ...order, __note: note } });
  }

  async function confirmMarkReady() {
    const order = confirm.order;
    if (!order) return;

    try {
      const hasLocal = Object.prototype.hasOwnProperty.call(noteMap, order.id);
      const pickerNote = hasLocal
        ? (noteMap[order.id] || "").trim()
        : undefined;

      await setStatus.mutateAsync({
        orderId: order.id,
        status: "ready",
        pickerNote,
      });

      setConfirm({ open: false, order: null });

      setPickedMap((prev) => {
        const next = { ...prev };
        delete next[order.id];
        savePickedMap(next);
        return next;
      });

      // אופציונלי: לנקות noteMap אחרי שההערה נשמרה ב־DB
      setNoteMap((prev) => {
        const next = { ...prev };
        delete next[order.id];
        saveNoteMap(next);
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

  const emptyText =
    activeTab === "pending"
      ? "אין הזמנות לליקוט כרגע"
      : activeTab === "ready"
        ? "אין הזמנות מוכנות כרגע"
        : activeTab === "completed"
          ? "אין הזמנות שנאספו כרגע"
          : "בקרוב…";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <TopBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={counts}
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

        {activeTab === "stock" ? (
          <div className="mt-6 card p-8 text-center">
            <div className="text-lg font-extrabold">עדכון מלאי</div>
            <div className="mt-2 text-sm text-slate-600">{emptyText}</div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : visibleOrders.length ? (
              visibleOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  busyOrderId={busyOrderId}
                  busyItemId={null}
                  onStartPicking={() => onStartPicking(order)}
                  onMarkReady={() => requestMarkReady(order)}
                  onToggleItem={(orderItemId, picked) =>
                    onToggleItem(order, orderItemId, picked)
                  }
                  pickerNote={
                    order.status === "confirmed" || order.status === "preparing"
                      ? (noteMap[order.id] ?? order.picker_note ?? "")
                      : (order.picker_note ?? "")
                  }
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
                <div className="text-lg font-extrabold">{emptyText}</div>
              </div>
            )}
          </div>
        )}

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

      <ConfirmReadyModal
        open={confirm.open}
        order={confirm.order}
        note={confirm.order?.__note || ""}
        busy={Boolean(busyOrderId)}
        onCancel={() => setConfirm({ open: false, order: null })}
        onConfirm={confirmMarkReady}
      />
    </div>
  );
}
