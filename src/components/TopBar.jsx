import { RefreshCw, Store } from "lucide-react";
import { getShopId } from "../lib/api";

export function TopBar({ confirmedCount, preparingCount, onRefresh, isRefreshing }) {
  const shopId = getShopId();
  return (
    <div className="card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-extrabold leading-tight">
  Pick & Pack <span className="text-slate-400 font-semibold">•</span>{" "}
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
              חנות <span className="font-semibold">#{shopId}</span> • הזמנות מאושרות
            </div>
          </div>
        </div>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <span className="pill bg-amber-100 text-amber-800">ממתינות: {confirmedCount}</span>
          <span className="pill bg-sky-100 text-sky-800">בליקוט: {preparingCount}</span>
          <button className="btn-outline" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            רענן
          </button>
        </div>
      </div>
    </div>
  );
}
