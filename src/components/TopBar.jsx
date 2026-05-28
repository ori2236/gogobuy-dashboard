import { createElement } from "react";
import {
  RefreshCw,
  Store,
  ClipboardList,
  Package,
  Truck,
  CheckCheck,
  Boxes,
  BadgePercent,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "../lib/utils";
import { getShopId } from "../lib/api";

function TabBtn({ active, onClick, icon, label, count }) {
  const hasCount = count !== undefined && count !== null;

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
      {createElement(icon, { className: "h-4 w-4" })}
      <span>{label}</span>
      {hasCount ? (
        <span
          className={cn(
            "ms-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-extrabold",
            active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-800",
          )}
        >
          {count ?? 0}
        </span>
      ) : null}
    </button>
  );
}

export function TopBar({
  activeTab,
  onTabChange,
  counts,
  onRefresh,
  isRefreshing,
  user,
  onLogout,
  shopInfo,
}) {
  const shopId = getShopId();
  const branchName = String(shopInfo?.name || "").trim();

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
                <span className="font-semibold">
                  {branchName || `חנות #${user?.shop_id ?? shopId}`}
                </span>
              </div>
            </div>
          </div>

          <div className="ms-auto flex flex-wrap items-center gap-2">
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
            <button className="btn-outline text-rose-700 hover:bg-rose-50" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              התנתק
            </button>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-end gap-2"
          dir="ltr"
        >
          <TabBtn
            active={activeTab === "settings"}
            onClick={() => onTabChange("settings")}
            icon={Settings}
            label="פרטי עסק"
          />
          <TabBtn
            active={activeTab === "completed"}
            onClick={() => onTabChange("completed")}
            icon={CheckCheck}
            label="הזמנות שהסתיימו"
            count={counts?.completed ?? 0}
          />
          <TabBtn
            active={activeTab === "delivering"}
            onClick={() => onTabChange("delivering")}
            icon={Truck}
            label="משלוחים בדרך"
            count={counts?.delivering ?? 0}
          />
          <TabBtn
            active={activeTab === "ready"}
            onClick={() => onTabChange("ready")}
            icon={Package}
            label="מוכנות לשליחה/איסוף"
            count={counts?.ready ?? 0}
          />
          <TabBtn
            active={activeTab === "pending"}
            onClick={() => onTabChange("pending")}
            icon={ClipboardList}
            label="הזמנות ממתינות"
            count={counts?.pending ?? 0}
          />
          <TabBtn
            active={activeTab === "promotions"}
            onClick={() => onTabChange("promotions")}
            icon={BadgePercent}
            label="מבצעים"
          />
          <TabBtn
            active={activeTab === "stock"}
            onClick={() => onTabChange("stock")}
            icon={Boxes}
            label="ניהול מלאי"
          />
        </div>
      </div>
    </div>
  );
}
