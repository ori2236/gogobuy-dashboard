import {
  RefreshCw,
  Store,
  ClipboardList,
  Package,
  CheckCheck,
  Boxes,
} from "lucide-react";
import { cn } from "../lib/utils";
import { getShopId } from "../lib/api";

function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold transition border",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span
        className={cn(
          "ms-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-extrabold",
          active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800",
        )}
      >
        {count ?? 0}
      </span>
    </button>
  );
}

export function TopBar({
  activeTab,
  onTabChange,
  counts,
  onRefresh,
  isRefreshing,
}) {
  const shopId = getShopId();

  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
              <Store className="h-5 w-5" />
            </div>

            <div>
              <div className="text-lg font-extrabold leading-tight">
                Pick &amp; Pack{" "}
                <span className="text-slate-400 font-semibold">•</span>{" "}
                <a
                  href="https://gogobuy.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-700 hover:text-slate-900 underline underline-offset-4 decoration-slate-200"
                >
                  gogobuy.ai
                </a>
              </div>

              <div className="text-sm text-slate-600">
                חנות <span className="font-semibold">#{shopId}</span>
              </div>
            </div>
          </div>

          <div className="ms-auto">
            <button
              className="btn-outline"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
              רענן
            </button>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-end gap-2"
          dir="ltr"
        >
          <TabBtn
            active={activeTab === "completed"}
            onClick={() => onTabChange("completed")}
            icon={CheckCheck}
            label="הזמנות שנאספו"
            count={counts?.completed ?? 0}
          />
          <TabBtn
            active={activeTab === "ready"}
            onClick={() => onTabChange("ready")}
            icon={Package}
            label="הזמנות מוכנות"
            count={counts?.ready ?? 0}
          />
          <TabBtn
            active={activeTab === "pending"}
            onClick={() => onTabChange("pending")}
            icon={ClipboardList}
            label="הזמנות ממתינות"
            count={counts?.pending ?? 0}
          />
          <button
            onClick={() => onTabChange("stock")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition border",
              activeTab === "stock"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            )}
          >
            <Boxes className="h-4 w-4" />
            עדכון מלאי
          </button>
        </div>
      </div>
    </div>
  );
}
