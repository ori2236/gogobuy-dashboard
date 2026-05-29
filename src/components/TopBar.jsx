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

function TabBtn({ active, onClick, icon, label, count, tone = "default" }) {
  const hasCount = count !== undefined && count !== null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold whitespace-nowrap transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : tone === "management"
            ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
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

  const lifecycleTabs = [
    { key: "pending", icon: ClipboardList, label: "הזמנות ממתינות", count: counts?.pending ?? 0 },
    { key: "readyPickup", icon: Package, label: "מוכנות לאיסוף", count: counts?.readyPickup ?? 0 },
    { key: "readyDelivery", icon: Truck, label: "מוכנות למשלוח", count: counts?.readyDelivery ?? 0 },
    { key: "delivering", icon: Truck, label: "משלוחים בדרך", count: counts?.delivering ?? 0 },
    { key: "completed", icon: CheckCheck, label: "הזמנות שהסתיימו", count: counts?.completed ?? 0 },
  ];

  const managementTabs = [
    { key: "stock", icon: Boxes, label: "מלאי" },
    { key: "promotions", icon: BadgePercent, label: "מבצעים" },
    { key: "settings", icon: Settings, label: "פרטי עסק" },
  ];

  return (
    <div className="card p-5 font-sans">
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
                <span className="text-slate-700 font-extrabold">gogobuy.ai</span>
              </div>

              <div className="text-sm text-slate-600">
                <span className="font-semibold">
                  {branchName || `חנות #${user?.shop_id ?? shopId}`}
                </span>
                {user?.role ? (
                  <span className="me-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    {user.role === "admin" ? "מנהל" : "משתמש"}
                  </span>
                ) : null}
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

        <div className="border-t border-slate-100 pt-4">
          <div className="dashboard-tabs flex flex-wrap items-center justify-start gap-2" dir="rtl">
            {lifecycleTabs.map((tab) => (
              <TabBtn
                key={tab.key}
                active={activeTab === tab.key}
                onClick={() => onTabChange(tab.key)}
                icon={tab.icon}
                label={tab.label}
                count={tab.count}
              />
            ))}

            {managementTabs.map((tab) => (
              <TabBtn
                key={tab.key}
                active={activeTab === tab.key}
                onClick={() => onTabChange(tab.key)}
                icon={tab.icon}
                label={tab.label}
                tone="management"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
