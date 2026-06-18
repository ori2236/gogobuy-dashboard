/* eslint-disable react-hooks/set-state-in-effect */
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Clock3,
  Gift,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import {
  useCartPromotionRules,
  useCreateCartPromotionRule,
  useCreatePromotion,
  useDeleteCartPromotionRule,
  useDeletePromotion,
  useProductGroupPromotions,
  useCreateProductGroupPromotion,
  useUpdateProductGroupPromotion,
  useDeleteProductGroupPromotion,
  usePromotions,
  useStockCategories,
  useUpdateCartPromotionRule,
  useUpdatePromotion,
} from "../lib/hooks";
import { cn } from "../lib/utils";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { PromotionModal } from "./PromotionModal";
import { CartPromotionModal } from "./CartPromotionModal";
import { ProductGroupPromotionModal } from "./ProductGroupPromotionModal";

const FILTERS = [
  { value: "all", label: "כל המבצעים" },
  { value: "active", label: "פעילים" },
  { value: "inactive", label: "לא פעילים" },
];

const CART_RULE_LABELS = {
  DELIVERY_FEE_OVERRIDE: "משלוח לפי סכום סל",
  GIFT_PRODUCT: "מתנה לפי סכום סל",
  THRESHOLD_PRODUCT_FIXED_PRICE: "מחיר מוצר לפי סכום סל",
};

const SORT_OPTIONS = [
  { value: "default", label: "ברירת מחדל" },
  { value: "start_at", label: "תאריך התחלה" },
  { value: "end_at", label: "תאריך תפוגה" },
  { value: "kind", label: "סוג מבצע" },
];

const CART_SORT_OPTIONS = [
  { value: "default", label: "ברירת מחדל" },
  { value: "type", label: "סוג מבצע + סכום מינימלי" },
  { value: "start_at", label: "תאריך התחלה" },
  { value: "end_at", label: "תאריך תפוגה" },
];

const GROUP_SORT_OPTIONS = [
  { value: "default", label: "ברירת מחדל" },
  { value: "title", label: "שם מבצע" },
  { value: "start_at", label: "תאריך התחלה" },
  { value: "end_at", label: "תאריך תפוגה" },
];

const ACTIVE_PROMO_TAB_CLASS = "bg-slate-950 text-white shadow-sm";
const PROMO_ADD_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

function toCategoriesMap(raw) {
  if (!raw) return {};

  const arr = raw.categories ?? raw.data ?? null;
  if (Array.isArray(arr)) {
    const map = {};
    for (const row of arr) {
      const c = row.category ?? row.name ?? row.key;
      if (!c) continue;
      const subs = row.sub_categories ?? row.subCategories ?? [];
      map[String(c)] = Array.isArray(subs) ? subs.map(String) : [];
    }
    return map;
  }

  if (typeof raw === "object") {
    const map = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!k) continue;
      map[String(k)] = Array.isArray(v) ? v.map(String) : [];
    }
    return map;
  }

  return {};
}

function fmtMoney(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "-";
  return `₪${Number(v).toFixed(2)}`;
}

function fmtShortNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(3).replace(/\.?0+$/, "");
}

function promoValueText(promo) {
  if (!promo) return "-";
  if (promo.kind === "PERCENT_OFF") return `${fmtShortNumber(promo.percent_off)}% הנחה`;
  if (promo.kind === "AMOUNT_OFF") return `${fmtMoney(promo.amount_off)} הנחה`;
  if (promo.kind === "FIXED_PRICE") return `מחיר ${fmtMoney(promo.fixed_price)}`;
  if (promo.kind === "BUNDLE") {
    return `${fmtShortNumber(promo.bundle_buy_qty)} יח׳ ב-${fmtMoney(promo.bundle_pay_price)}`;
  }
  return "-";
}

function promoMaxText(promo) {
  return usageLimitText(promo?.max_discounted_qty);
}

function cartRuleThresholdText(rule) {
  return fmtMoney(rule?.threshold_amount);
}

function cartRuleBenefitText(rule) {
  if (!rule) return "-";
  if (rule.rule_type === "DELIVERY_FEE_OVERRIDE") {
    const fee = Number(rule.delivery_fee_override || 0);
    return fee <= 0 ? "משלוח חינם" : `משלוח ב-${fmtMoney(fee)}`;
  }
  if (rule.rule_type === "GIFT_PRODUCT") {
    const qty = Number(rule.reward_qty || 1);
    const qtyText = Number.isFinite(qty) && qty > 1 ? `${fmtShortNumber(qty)} × ` : "";
    return `${qtyText}${rule.reward_product_name || rule.gift_text || "מתנה"} מתנה`;
  }
  if (rule.rule_type === "THRESHOLD_PRODUCT_FIXED_PRICE") {
    return `${rule.reward_product_name || "מוצר"} ב-${fmtMoney(rule.reward_fixed_price)}`;
  }
  return "-";
}

function cartRuleMaxText(rule) {
  if (rule?.rule_type !== "THRESHOLD_PRODUCT_FIXED_PRICE") return "";
  return usageLimitText(rule.reward_max_qty);
}

function cartRuleRegularPriceText(rule) {
  if (!rule?.reward_product_id) return "";
  const price = Number(rule.reward_product_price);
  if (!Number.isFinite(price) || price <= 0) return "";
  return `מחיר רגיל ${fmtMoney(price)}`;
}

function cartRuleValueText(rule) {
  if (!rule) return "-";
  const threshold = fmtMoney(rule.threshold_amount);
  if (rule.rule_type === "DELIVERY_FEE_OVERRIDE") {
    const fee = Number(rule.delivery_fee_override || 0);
    return fee <= 0 ? `${threshold} ומעלה → משלוח חינם` : `${threshold} ומעלה → משלוח ${fmtMoney(fee)}`;
  }
  if (rule.rule_type === "GIFT_PRODUCT") {
    return `${threshold} ומעלה → ${rule.reward_product_name || rule.gift_text || "מתנה"} מתנה`;
  }
  if (rule.rule_type === "THRESHOLD_PRODUCT_FIXED_PRICE") {
    const max = rule.reward_max_qty ? `, עד ${fmtShortNumber(rule.reward_max_qty)} יח׳` : "";
    return `${threshold} ומעלה → ${rule.reward_product_name || "מוצר"} ב-${fmtMoney(rule.reward_fixed_price)}${max}`;
  }
  return "-";
}

function productPriceText(promo) {
  return fmtMoney(promo?.product_price);
}

function groupProductName(product) {
  return product?.name || `#${product?.id}`;
}

function GroupProductsCell({ group }) {
  const products = Array.isArray(group?.products) ? group.products : [];
  if (!products.length) return null;

  const shown = products.slice(0, 2).map(groupProductName);
  const moreCount = Math.max(0, products.length - shown.length);

  return (
    <div className="leading-6 text-slate-800">
      {shown.join(", ")}
      {moreCount > 0 ? (
        <>
          {" "}
          <span className="font-extrabold text-slate-950">ועוד {moreCount}</span>
        </>
      ) : null}
    </div>
  );
}

function groupProductCountText(group) {
  const products = Array.isArray(group?.products) ? group.products : [];
  if (!products.length) return "";
  return `${products.length} מוצרים`;
}

function GroupProductsExpandedRow({ group }) {
  const products = Array.isArray(group?.products) ? group.products : [];
  if (!products.length) return null;

  return (
    <tr className="bg-purple-50/40">
      <td colSpan={5} className="px-4 pb-4 pt-0">
        <div className="rounded-2xl border border-purple-100 bg-white p-4 text-right shadow-sm" dir="rtl">
          <div className="mb-3 text-xs font-extrabold text-slate-600">כל המוצרים בקבוצה</div>
          <div className="flex flex-wrap gap-2">
            {products.map((product) => (
              <span
                key={product.id || groupProductName(product)}
                className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-900"
              >
                {groupProductName(product)}
              </span>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

function groupValueText(group) {
  if (!group) return "-";
  return `${fmtShortNumber(group.bundle_buy_qty)} יח׳ ב-${fmtMoney(group.bundle_pay_price)}`;
}

function groupMaxText(group) {
  return usageLimitText(group?.max_discounted_qty);
}

function cartRuleIcon(ruleType) {
  if (ruleType === "DELIVERY_FEE_OVERRIDE") return <Truck className="h-4 w-4 text-blue-700" />;
  if (ruleType === "GIFT_PRODUCT") return <Gift className="h-4 w-4 text-emerald-700" />;
  return <ShoppingCart className="h-4 w-4 text-amber-700" />;
}

function rowModeKey(type, id) {
  return `${type}:${id}`;
}

function statusInfo(promo) {
  if (promo?.is_expired || promo?.status === "expired") {
    return {
      label: "פג תוקף",
      className: "bg-rose-500/90 text-white shadow-sm shadow-rose-900/10",
    };
  }

  if (promo?.is_upcoming || promo?.status === "upcoming") {
    return {
      label: "עתידי",
      className: "bg-blue-500/90 text-white shadow-sm shadow-blue-900/10",
    };
  }

  const hasCurrentFlag = Object.prototype.hasOwnProperty.call(promo || {}, "is_currently_active");
  const currentlyActive = hasCurrentFlag ? Boolean(promo?.is_currently_active) : Boolean(promo?.is_active);
  if (currentlyActive || promo?.status === "active") {
    return {
      label: "פעיל",
      className: "bg-emerald-500/90 text-white shadow-sm shadow-emerald-900/10",
    };
  }

  return {
    label: "לא פעיל",
    className: "bg-slate-400/90 text-white shadow-sm shadow-slate-900/10",
  };
}
function formatDateOnly(value) {
  if (!value) return "";
  const direct = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (direct) return `${direct[3]}.${direct[2]}.${direct[1]}`;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function dateRangeText(promo) {
  return {
    start: promo?.start_at ? formatDateOnly(promo.start_at) : "",
    end: promo?.end_at ? formatDateOnly(promo.end_at) : "",
  };
}

function usageLimitText(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  const label = n === 1 ? "שימוש" : "שימושים";
  return `עד ${fmtShortNumber(n)} ${label}`;
}

function LimitPill({ children }) {
  if (!children) return null;
  return (
    <div className="mt-2 inline-flex whitespace-nowrap rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-extrabold leading-none text-rose-700">
      {children}
    </div>
  );
}

function StatusOrValidityHeader({ value = "status", onChange }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-white p-0.5 text-[11px] font-extrabold text-slate-500 shadow-sm" dir="rtl">
      <button
        type="button"
        className={cn(
          "rounded-full px-2.5 py-1 transition",
          value === "status" ? "bg-slate-200 text-slate-950 shadow-sm" : "hover:bg-slate-100 hover:text-slate-800",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onChange?.("status");
        }}
      >
        סטטוס
      </button>
      <button
        type="button"
        className={cn(
          "rounded-full px-2.5 py-1 transition",
          value === "validity" ? "bg-slate-200 text-slate-950 shadow-sm" : "hover:bg-slate-100 hover:text-slate-800",
        )}
        onClick={(e) => {
          e.stopPropagation();
          onChange?.("validity");
        }}
      >
        תוקף
      </button>
    </div>
  );
}

function StatusOrValidityCell({ item, mode, onToggle }) {
  const dates = dateRangeText(item);

  if (mode === "validity") {
    return (
      <button
        type="button"
        className="inline-flex min-w-[7.8rem] flex-col items-center justify-center px-1 py-1 text-xs font-semibold leading-6 text-slate-500 transition hover:text-slate-700 focus:outline-none"
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        title="לחיצה מחזירה לתצוגת סטטוס"
      >
        {dates.start ? <span className="whitespace-nowrap">מ {dates.start}</span> : null}
        {dates.end ? <span className="whitespace-nowrap">עד {dates.end}</span> : null}
        {!dates.start && !dates.end ? <span className="whitespace-nowrap">ללא תוקף</span> : null}
      </button>
    );
  }

  const s = statusInfo(item);
  return (
    <button
      type="button"
      className={cn("inline-flex min-w-[4.6rem] justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-normal leading-5 transition hover:brightness-95", s.className)}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      title="לחיצה מציגה את תוקף המבצע"
    >
      {s.label}
    </button>
  );
}

function SortControl({ value, options, onValueChange }) {
  return (
    <div dir="rtl">
      <div className="text-xs font-bold text-slate-700">מיון</div>
      <select
        className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SortDirectionChip({ disabled, direction, onClick }) {
  if (disabled) return null;
  return (
    <button
      type="button"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
      onClick={onClick}
      title={direction === "asc" ? "סדר עולה" : "סדר יורד"}
      dir="rtl"
      aria-label={direction === "asc" ? "סדר עולה" : "סדר יורד"}
    >
      {direction === "asc" ? "↑" : "↓"}
    </button>
  );
}

const ACTION_BUTTON_CLASS = "w-14 px-1.5 py-1.5 text-sm";

function SummaryCard({ active, className, icon, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm",
        active ? "ring-2 ring-slate-900/80" : "",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value ?? 0}</div>
    </button>
  );
}

export function PromotionsPage({
  onNotify,
  onRegisterRefetch,
  onFetchingChange,
}) {
  const [status, setStatus] = useState("all");
  const [globalDisplayMode, setGlobalDisplayMode] = useState("status");
  const [rowDisplayModes, setRowDisplayModes] = useState({});
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set());
  const [q, setQ] = useState("");
  const [promoTab, setPromoTab] = useState("products");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [sortField, setSortField] = useState("default");
  const [sortDir, setSortDir] = useState("desc");
  const [cartSortField, setCartSortField] = useState("default");
  const [cartSortDir, setCartSortDir] = useState("desc");
  const [groupSortField, setGroupSortField] = useState("default");
  const [groupSortDir, setGroupSortDir] = useState("desc");
  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    promotion: null,
  });
  const [confirmDel, setConfirmDel] = useState({ open: false, promotion: null });
  const [cartModal, setCartModal] = useState({
    open: false,
    mode: "create",
    rule: null,
  });
  const [groupModal, setGroupModal] = useState({
    open: false,
    mode: "create",
    promotion: null,
  });
  const [confirmCartDel, setConfirmCartDel] = useState({ open: false, rule: null });
  const [confirmGroupDel, setConfirmGroupDel] = useState({ open: false, promotion: null });

  const qDebounced = useDebouncedValue(q, 300);
  const sort_by = sortField;
  const sort_dir = sortDir;

  const catQuery = useStockCategories();
  const categoriesMap = useMemo(
    () => toCategoriesMap(catQuery.data),
    [catQuery.data],
  );

  const categoryList = useMemo(
    () => Object.keys(categoriesMap).sort((a, b) => a.localeCompare(b, "he")),
    [categoriesMap],
  );

  const subCategoryList = useMemo(() => {
    if (!category) return [];
    return (categoriesMap[category] || [])
      .slice()
      .sort((a, b) => a.localeCompare(b, "he"));
  }, [categoriesMap, category]);

  useEffect(() => {
    if (!category) {
      setSubCategory("");
      return;
    }
    if (subCategory && !(categoriesMap[category] || []).includes(subCategory)) {
      setSubCategory("");
    }
  }, [category, subCategory, categoriesMap]);

  const promosQuery = usePromotions({
    status,
    q: String(qDebounced || "").trim(),
    category: category || null,
    sub_category: subCategory || null,
    sort_by,
    sort_dir,
  });
  const cartRulesQuery = useCartPromotionRules({
    status,
    q: String(qDebounced || "").trim(),
  });
  const groupPromosQuery = useProductGroupPromotions({
    status,
    q: String(qDebounced || "").trim(),
  });

  const createMut = useCreatePromotion();
  const updateMut = useUpdatePromotion();
  const deleteMut = useDeletePromotion();
  const createCartMut = useCreateCartPromotionRule();
  const updateCartMut = useUpdateCartPromotionRule();
  const deleteCartMut = useDeleteCartPromotionRule();
  const createGroupMut = useCreateProductGroupPromotion();
  const updateGroupMut = useUpdateProductGroupPromotion();
  const deleteGroupMut = useDeleteProductGroupPromotion();

  const busy =
    createMut.isPending ||
    updateMut.isPending ||
    deleteMut.isPending ||
    createCartMut.isPending ||
    updateCartMut.isPending ||
    deleteCartMut.isPending ||
    createGroupMut.isPending ||
    updateGroupMut.isPending ||
    deleteGroupMut.isPending;
  const promotions = promosQuery.data?.promotions || [];
  const cartRules = cartRulesQuery.data?.cart_promotion_rules || [];
  const rawGroupPromotions = groupPromosQuery.data?.product_group_promotions || [];
  const counts = promosQuery.data?.counts || { total: 0, active: 0, inactive: 0 };
  const cartCounts = cartRulesQuery.data?.counts || { total: 0, active: 0, inactive: 0 };
  const groupCounts = groupPromosQuery.data?.counts || { total: 0, active: 0, inactive: 0 };
  const combinedCounts = {
    total: Number(counts.total || 0) + Number(cartCounts.total || 0) + Number(groupCounts.total || 0),
    active: Number(counts.active || 0) + Number(cartCounts.active || 0) + Number(groupCounts.active || 0),
    inactive: Number(counts.inactive || 0) + Number(cartCounts.inactive || 0) + Number(groupCounts.inactive || 0),
  };

  const refetchFn = useCallback(() => {
    promosQuery.refetch();
    cartRulesQuery.refetch();
    groupPromosQuery.refetch();
  }, [promosQuery.refetch, cartRulesQuery.refetch, groupPromosQuery.refetch]);
  useEffect(() => {
    onRegisterRefetch?.(refetchFn);
    return () => onRegisterRefetch?.(null);
  }, [onRegisterRefetch, refetchFn]);

  useEffect(() => {
    onFetchingChange?.(Boolean(promosQuery.isFetching || cartRulesQuery.isFetching || groupPromosQuery.isFetching || catQuery.isFetching));
  }, [onFetchingChange, promosQuery.isFetching, cartRulesQuery.isFetching, groupPromosQuery.isFetching, catQuery.isFetching]);

  const activeFilterLabel = useMemo(() => {
    return FILTERS.find((f) => f.value === status)?.label || "כל המבצעים";
  }, [status]);

  const sortedCartRules = useMemo(() => {
    const rows = Array.isArray(cartRules) ? cartRules.slice() : [];

    function num(v) {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }

    function timeValue(v, fallback) {
      if (!v) return fallback;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : fallback;
    }

    const dir = cartSortDir === "asc" ? 1 : -1;

    if (cartSortField === "type") {
      rows.sort((a, b) => {
        const typeCmp = String(CART_RULE_LABELS[a.rule_type] || a.rule_type || "").localeCompare(
          String(CART_RULE_LABELS[b.rule_type] || b.rule_type || ""),
          "he",
        );
        if (typeCmp !== 0) return typeCmp * dir;
        return (num(a.threshold_amount) - num(b.threshold_amount)) * dir;
      });
      return rows;
    }

    if (cartSortField === "start_at") {
      rows.sort((a, b) => (timeValue(a.start_at, 0) - timeValue(b.start_at, 0)) * dir);
      return rows;
    }

    if (cartSortField === "end_at") {
      const emptyFallback = cartSortDir === "asc" ? Number.MAX_SAFE_INTEGER : 0;
      rows.sort((a, b) => (timeValue(a.end_at, emptyFallback) - timeValue(b.end_at, emptyFallback)) * dir);
      return rows;
    }

    return rows;
  }, [cartRules, cartSortField, cartSortDir]);

  const groupPromotions = useMemo(() => {
    const rows = Array.isArray(rawGroupPromotions) ? rawGroupPromotions.slice() : [];
    const dir = groupSortDir === "asc" ? 1 : -1;

    function timeValue(v, fallback) {
      if (!v) return fallback;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : fallback;
    }

    if (groupSortField === "title") {
      rows.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "he") * dir);
      return rows;
    }

    if (groupSortField === "start_at") {
      rows.sort((a, b) => (timeValue(a.start_at, 0) - timeValue(b.start_at, 0)) * dir);
      return rows;
    }

    if (groupSortField === "end_at") {
      const emptyFallback = groupSortDir === "asc" ? Number.MAX_SAFE_INTEGER : 0;
      rows.sort((a, b) => (timeValue(a.end_at, emptyFallback) - timeValue(b.end_at, emptyFallback)) * dir);
      return rows;
    }

    return rows;
  }, [rawGroupPromotions, groupSortField, groupSortDir]);

  const isCartTab = promoTab === "cart";
  const isGroupTab = promoTab === "groups";
  const isProductsTab = promoTab === "products";
  const currentFilteredCount = isCartTab
    ? sortedCartRules.length
    : isGroupTab
      ? groupPromotions.length
      : promotions.length;
  const currentSortField = isCartTab ? cartSortField : isGroupTab ? groupSortField : sortField;
  const currentSortDir = isCartTab ? cartSortDir : isGroupTab ? groupSortDir : sortDir;

  function toggleCurrentSortDirection() {
    if (isCartTab) {
      setCartSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    if (isGroupTab) {
      setGroupSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  function toggleGroupExpanded(groupId) {
    const id = Number(groupId);
    if (!Number.isFinite(id)) return;
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setGlobalStatusValidityMode(mode) {
    setGlobalDisplayMode(mode);
    setRowDisplayModes({});
  }

  function rowDisplayMode(type, id) {
    return rowDisplayModes[rowModeKey(type, id)] || globalDisplayMode;
  }

  function toggleRowDisplayMode(type, id) {
    const key = rowModeKey(type, id);
    const current = rowDisplayMode(type, id);
    setRowDisplayModes((prev) => ({
      ...prev,
      [key]: current === "validity" ? "status" : "validity",
    }));
  }

  async function onSavePromotion(payload) {
    try {
      if (modal.mode === "create") {
        await createMut.mutateAsync(payload);
        onNotify?.("success", "מבצע נוסף בהצלחה");
      } else {
        const id = modal.promotion?.id;
        if (!id) return;
        await updateMut.mutateAsync({ id, payload });
        onNotify?.("success", "מבצע עודכן בהצלחה");
      }
      setModal({ open: false, mode: "create", promotion: null });
    } catch (e) {
      onNotify?.("error", e?.message || "שגיאה בשמירת מבצע");
    }
  }

  async function onSaveCartRule(payload) {
    try {
      if (cartModal.mode === "create") {
        await createCartMut.mutateAsync(payload);
        onNotify?.("success", "מבצע סל נוסף בהצלחה");
      } else {
        const id = cartModal.rule?.id;
        if (!id) return;
        await updateCartMut.mutateAsync({ id, payload });
        onNotify?.("success", "מבצע סל עודכן בהצלחה");
      }
      setCartModal({ open: false, mode: "create", rule: null });
    } catch (e) {
      onNotify?.("error", e?.message || "שגיאה בשמירת מבצע סל");
    }
  }

  async function onSaveGroupPromotion(payload) {
    try {
      if (groupModal.mode === "create") {
        await createGroupMut.mutateAsync(payload);
        onNotify?.("success", "מבצע קבוצת מוצרים נוסף בהצלחה");
      } else {
        const id = groupModal.promotion?.id;
        if (!id) return;
        await updateGroupMut.mutateAsync({ id, payload });
        onNotify?.("success", "מבצע קבוצת מוצרים עודכן בהצלחה");
      }
      setGroupModal({ open: false, mode: "create", promotion: null });
    } catch (e) {
      onNotify?.("error", e?.message || "שגיאה בשמירת מבצע קבוצת מוצרים");
    }
  }

  async function onConfirmDelete() {
    const promo = confirmDel.promotion;
    if (!promo) return;

    try {
      await deleteMut.mutateAsync(promo.id);
      setConfirmDel({ open: false, promotion: null });
      onNotify?.("success", "המבצע נמחק");
    } catch (e) {
      onNotify?.("error", e?.message || "שגיאה במחיקת מבצע");
    }
  }

  async function onConfirmCartDelete() {
    const rule = confirmCartDel.rule;
    if (!rule) return;

    try {
      await deleteCartMut.mutateAsync(rule.id);
      setConfirmCartDel({ open: false, rule: null });
      onNotify?.("success", "מבצע הסל נמחק");
    } catch (e) {
      onNotify?.("error", e?.message || "שגיאה במחיקת מבצע סל");
    }
  }

  async function onConfirmGroupDelete() {
    const promotion = confirmGroupDel.promotion;
    if (!promotion) return;

    try {
      await deleteGroupMut.mutateAsync(promotion.id);
      setConfirmGroupDel({ open: false, promotion: null });
      onNotify?.("success", "מבצע קבוצת המוצרים נמחק");
    } catch (e) {
      onNotify?.("error", e?.message || "שגיאה במחיקת מבצע קבוצת מוצרים");
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2" dir="rtl">
        <button
          type="button"
          onClick={() => setPromoTab("products")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition",
            promoTab === "products"
              ? ACTIVE_PROMO_TAB_CLASS
              : "bg-slate-200/70 text-slate-700 hover:bg-slate-200",
          )}
        >
          <BadgePercent className="h-4 w-4" />
          מבצעי מוצרים
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{promotions.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setPromoTab("groups")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition",
            promoTab === "groups"
              ? ACTIVE_PROMO_TAB_CLASS
              : "bg-slate-200/70 text-slate-700 hover:bg-slate-200",
          )}
        >
          <Sparkles className="h-4 w-4" />
          מבצעי קבוצות
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{groupPromotions.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setPromoTab("cart")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition",
            promoTab === "cart"
              ? ACTIVE_PROMO_TAB_CLASS
              : "bg-slate-200/70 text-slate-700 hover:bg-slate-200",
          )}
        >
          <Sparkles className="h-4 w-4" />
          מבצעי סל
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{cartRules.length}</span>
        </button>
      </div>

      <div className="mt-3 card p-0 overflow-hidden">
        <div className="p-6 sm:p-7" dir="rtl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <BadgePercent className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1 text-right">
              <div className="text-xl font-extrabold leading-tight">
                ניהול מבצעים
              </div>
              <div className="mt-1 text-sm text-slate-600">
                צפייה, סינון, הוספה, עריכה ומחיקה של מבצעי מוצרים, מבצעי קבוצות ומבצעי סל. מבצע בתוקף נקבע אוטומטית לפי התאריכים.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isCartTab ? (
              <button
                className={PROMO_ADD_BUTTON_CLASS}
                onClick={() =>
                  setCartModal({ open: true, mode: "create", rule: null })
                }
                disabled={busy}
                title="מבצע לפי סכום סל: משלוח מוזל/חינם, מתנה, או מחיר מיוחד למוצר"
              >
                <Plus className="h-4 w-4" />
                הוסף מבצע סל
              </button>
            ) : isGroupTab ? (
              <button
                className={PROMO_ADD_BUTTON_CLASS}
                onClick={() =>
                  setGroupModal({ open: true, mode: "create", promotion: null })
                }
                disabled={busy}
                title="מבצע על קבוצת מוצרים עם שילובים בין מוצרים שונים"
              >
                <Plus className="h-4 w-4" />
                הוסף מבצע קבוצתי
              </button>
            ) : (
              <button
                className={PROMO_ADD_BUTTON_CLASS}
                onClick={() =>
                  setModal({ open: true, mode: "create", promotion: null })
                }
                disabled={busy}
              >
                <Plus className="h-4 w-4" />
                הוסף מבצע מוצר
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            active={status === "active"}
            className="border-emerald-100 bg-emerald-50 text-emerald-900"
            icon={<Sparkles className="h-4 w-4 text-emerald-700" />}
            label="פעילים עכשיו"
            value={combinedCounts.active}
            onClick={() => setStatus("active")}
          />

          <SummaryCard
            active={status === "inactive"}
            className="border-slate-100 bg-slate-50 text-slate-900"
            icon={<Clock3 className="h-4 w-4 text-slate-500" />}
            label="לא פעילים"
            value={combinedCounts.inactive}
            onClick={() => setStatus("inactive")}
          />

          <SummaryCard
            active={status === "all"}
            className="border-amber-100 bg-amber-50 text-amber-900"
            icon={<BadgePercent className="h-4 w-4 text-amber-700" />}
            label="סה״כ מבצעים"
            value={combinedCounts.total}
            onClick={() => setStatus("all")}
          />
        </div>


        <div className="mt-5 rounded-2xl bg-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-12">
            {isProductsTab ? (
              <>
                <div className="sm:col-span-3">
                  <div className="text-xs font-bold text-slate-700">קטגוריה</div>
                  <select
                    className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">כל הקטגוריות</option>
                    {categoryList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <div className="text-xs font-bold text-slate-700">תת-קטגוריה</div>
                  <select
                    className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                    value={subCategory}
                    disabled={!category}
                    onChange={(e) => setSubCategory(e.target.value)}
                  >
                    <option value="">כל תתי-הקטגוריות</option>
                    {subCategoryList.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <SortControl
                    value={sortField}
                    options={SORT_OPTIONS}
                    onValueChange={setSortField}
                  />
                </div>
              </>
            ) : null}

            {isCartTab ? (
              <div className="sm:col-span-4">
                <SortControl
                  value={cartSortField}
                  options={CART_SORT_OPTIONS}
                  onValueChange={setCartSortField}
                />
              </div>
            ) : null}

            {isGroupTab ? (
              <div className="sm:col-span-4">
                <SortControl
                  value={groupSortField}
                  options={GROUP_SORT_OPTIONS}
                  onValueChange={setGroupSortField}
                />
              </div>
            ) : null}

            <div className={isCartTab ? "sm:col-span-8" : isGroupTab ? "sm:col-span-8" : "sm:col-span-3"}>
              <div className="text-xs font-bold text-slate-700">חיפוש</div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  className="w-full rounded-2xl bg-white ps-10 pe-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={isCartTab ? "סוג מבצע / מוצר / מתנה / תיאור" : isGroupTab ? "שם מבצע קבוצתי / מוצר בקבוצה / תיאור" : "שם מוצר / תיאור / שם באנגלית"}
                />
              </div>
            </div>
          </div>

          {isProductsTab && catQuery.isLoading ? (
            <div className="mt-3 text-sm text-slate-600">טוען קטגוריות…</div>
          ) : isProductsTab && catQuery.error ? (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">
              שגיאה בטעינת קטגוריות: {String(catQuery.error?.message || "")}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2" dir="rtl">
          <span className="pill bg-amber-50 text-amber-700">
            {activeFilterLabel}: {currentFilteredCount}
          </span>
          <SortDirectionChip
            disabled={currentSortField === "default"}
            direction={currentSortDir}
            onClick={toggleCurrentSortDirection}
          />
          {isProductsTab && category ? (
            <span className="pill bg-slate-100 text-slate-700">
              קטגוריה: {category}
            </span>
          ) : null}
          {isProductsTab && subCategory ? (
            <span className="pill bg-slate-100 text-slate-700">
              תת-קטגוריה: {subCategory}
            </span>
          ) : null}
        </div>

        {isProductsTab ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-right text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-700">
                <tr>
                  <th className="w-[25%] px-3 py-3">מוצר</th>
                  <th className="w-[15%] px-3 py-3 text-center">קטגוריה</th>
                  <th className="w-[9%] px-2 py-3 text-center whitespace-nowrap">מחיר מוצר</th>
                  <th className="w-[12%] px-2 py-3 text-center whitespace-nowrap">מבצע</th>
                  <th className="w-[16%] px-3 py-3 text-center">תיאור</th>
                  <th className="w-[14%] px-2 py-3 text-center"><StatusOrValidityHeader value={globalDisplayMode} onChange={setGlobalStatusValidityMode} /></th>
                  <th className="w-[9%] px-2 py-3 text-center">פעולות</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {promosQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                      טוען מבצעים…
                    </td>
                  </tr>
                ) : promosQuery.error ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-rose-700" colSpan={7}>
                      שגיאה בטעינת מבצעים: {String(promosQuery.error?.message || "")}
                    </td>
                  </tr>
                ) : promotions.length ? (
                  promotions.map((promo) => {
                    return (
                      <tr key={promo.id} className="hover:bg-slate-50">
                        <td className="w-[25%] px-3 py-3 text-slate-900">
                          <div className="break-words font-bold leading-6">{promo.product_name || `#${promo.product_id}`}</div>
                          <div className="mt-1 break-words text-xs leading-5 text-slate-500" dir="ltr">
                            {promo.product_display_name_en || ""}
                          </div>
                        </td>

                        <td className="w-[15%] px-3 py-3 text-center text-slate-700">
                          <div>{promo.product_category || ""}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {promo.product_sub_category || ""}
                          </div>
                        </td>

                        <td className="w-[9%] px-2 py-3 text-center whitespace-nowrap font-semibold text-slate-800">
                          {productPriceText(promo)}
                        </td>

                        <td className="w-[12%] px-2 py-3 text-center font-bold text-slate-900">
                          <div className="whitespace-nowrap">{promoValueText(promo)}</div>
                          <LimitPill>{promoMaxText(promo)}</LimitPill>
                        </td>

                        <td className="w-[16%] px-3 py-3 text-center text-slate-700">
                          <div className="line-clamp-3 break-words">
                            {promo.description || ""}
                          </div>
                        </td>

                        <td className="w-[14%] px-2 py-3 text-center">
                          <StatusOrValidityCell item={promo} mode={rowDisplayMode("product", promo.id)} onToggle={() => toggleRowDisplayMode("product", promo.id)} />
                        </td>

                        <td className="w-[9%] px-2 py-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 whitespace-nowrap">
                            <button
                              className={cn("btn-secondary", ACTION_BUTTON_CLASS)}
                              disabled={busy}
                              onClick={() =>
                                setModal({
                                  open: true,
                                  mode: "edit",
                                  promotion: promo,
                                })
                              }
                            >
                              עריכה
                            </button>
                            <button
                              className={cn("btn-outline", ACTION_BUTTON_CLASS)}
                              disabled={busy}
                              onClick={() =>
                                setConfirmDel({ open: true, promotion: promo })
                              }
                            >
                              מחיקה
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                      אין מבצעים שמתאימים לסינון הנוכחי.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        ) : null}

        {isGroupTab ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-purple-100 bg-white">
            <div className="border-b border-purple-100 bg-purple-50 px-4 py-3 text-right" dir="rtl">
              <div className="text-sm font-extrabold text-purple-950">מבצעי קבוצות</div>
              <div className="mt-1 text-xs font-semibold text-slate-950">
                מבצעים שמאפשרים לשלב כמה מוצרים שונים מאותה קבוצה
              </div>
            </div>
            <div className="overflow-hidden">
              <table className="w-full table-fixed text-right text-sm">
                <thead className="bg-white text-xs font-extrabold text-slate-700">
                  <tr>
                    <th className="w-[20%] px-3 py-3">שם המבצע</th>
                    <th className="w-[38%] px-3 py-3">מוצרים בקבוצה</th>
                    <th className="w-[17%] px-2 py-3 text-center whitespace-nowrap">מבצע</th>
                    <th className="w-[14%] px-2 py-3 text-center"><StatusOrValidityHeader value={globalDisplayMode} onChange={setGlobalStatusValidityMode} /></th>
                    <th className="w-[11%] px-2 py-3 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupPromosQuery.isLoading ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>טוען מבצעי קבוצות…</td>
                    </tr>
                  ) : groupPromosQuery.error ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-rose-700" colSpan={5}>
                        שגיאה בטעינת מבצעי קבוצות: {String(groupPromosQuery.error?.message || "")}
                      </td>
                    </tr>
                  ) : groupPromotions.length ? (
                    groupPromotions.map((group) => {
                      const isExpanded = expandedGroupIds.has(Number(group.id));
                      const countText = groupProductCountText(group);
                      return (
                        <Fragment key={group.id}>
                          <tr className="cursor-pointer hover:bg-slate-50" onClick={() => toggleGroupExpanded(group.id)}>
                            <td className="w-[20%] px-3 py-3 text-slate-900">
                              <div className="break-words font-bold">{group.emoji || "🏷️"} {group.title || `#${group.id}`}</div>
                              {countText ? (
                                <div className="mt-1 text-xs font-extrabold text-slate-500">{countText}</div>
                              ) : null}
                              {group.description ? (
                                <div className="mt-1 line-clamp-2 break-words text-xs text-slate-500">{group.description}</div>
                              ) : null}
                            </td>
                            <td className="w-[38%] px-3 py-3 text-slate-700">
                              <GroupProductsCell group={group} />
                            </td>
                            <td className="w-[17%] px-2 py-3 text-center font-bold text-slate-900">
                              <div className="whitespace-nowrap">{groupValueText(group)}</div>
                              <LimitPill>{groupMaxText(group)}</LimitPill>
                            </td>
                            <td className="w-[14%] px-2 py-3 text-center">
                              <StatusOrValidityCell item={group} mode={rowDisplayMode("group", group.id)} onToggle={() => toggleRowDisplayMode("group", group.id)} />
                            </td>
                            <td className="w-[11%] px-2 py-3 text-center">
                              <div className="flex flex-col items-center justify-center gap-2 whitespace-nowrap">
                                <button
                                  className={cn("btn-secondary", ACTION_BUTTON_CLASS)}
                                  disabled={busy}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGroupModal({ open: true, mode: "edit", promotion: group });
                                  }}
                                >
                                  עריכה
                                </button>
                                <button
                                  className={cn("btn-outline", ACTION_BUTTON_CLASS)}
                                  disabled={busy}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmGroupDel({ open: true, promotion: group });
                                  }}
                                >
                                  מחיקה
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded ? <GroupProductsExpandedRow group={group} /> : null}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                        אין מבצעי קבוצות שמתאימים לסינון הנוכחי.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {isCartTab ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3 text-right" dir="rtl">
            <div className="text-sm font-extrabold text-emerald-950">מבצעי סל</div>
            <div className="mt-1 text-xs font-semibold text-emerald-800">
              מבצעים לפי סכום הזמנה: משלוח, מתנה, או מחיר מיוחד למוצר.
            </div>
          </div>
          <div className="overflow-hidden">
            <table className="w-full table-fixed text-right text-sm">
              <thead className="bg-white text-xs font-extrabold text-slate-700">
                <tr>
                  <th className="w-[24%] px-3 py-3">סוג</th>
                  <th className="w-[18%] px-3 py-3 text-center">סכום מינימלי</th>
                  <th className="w-[28%] px-3 py-3 text-center">הטבה</th>
                  <th className="w-[16%] px-2 py-3 text-center"><StatusOrValidityHeader value={globalDisplayMode} onChange={setGlobalStatusValidityMode} /></th>
                  <th className="w-[14%] px-2 py-3 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cartRulesQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>טוען מבצעי סל…</td>
                  </tr>
                ) : cartRulesQuery.error ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-rose-700" colSpan={5}>
                      שגיאה בטעינת מבצעי סל: {String(cartRulesQuery.error?.message || "")}
                    </td>
                  </tr>
                ) : sortedCartRules.length ? (
                  sortedCartRules.map((rule) => {
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50">
                        <td className="w-[24%] px-3 py-3 text-slate-700">
                          <div className="inline-flex max-w-full items-center justify-center gap-2 whitespace-nowrap" dir="rtl">
                            {cartRuleIcon(rule.rule_type)}
                            <span>{CART_RULE_LABELS[rule.rule_type] || rule.rule_type}</span>
                          </div>
                        </td>
                        <td className="w-[18%] px-3 py-3 text-center font-bold text-slate-900">
                          בקנייה מעל {cartRuleThresholdText(rule)}
                        </td>

                        <td className="w-[28%] px-3 py-3 text-center font-bold text-slate-900">
                          <div className="break-words">{cartRuleBenefitText(rule)}</div>
                          <LimitPill>{cartRuleMaxText(rule)}</LimitPill>
                          <LimitPill>{cartRuleRegularPriceText(rule)}</LimitPill>
                        </td>

                        <td className="w-[16%] px-2 py-3 text-center">
                          <StatusOrValidityCell item={rule} mode={rowDisplayMode("cart", rule.id)} onToggle={() => toggleRowDisplayMode("cart", rule.id)} />
                        </td>
                        <td className="w-[14%] px-2 py-3 text-center">
                          <div className="flex flex-col items-center justify-center gap-2 whitespace-nowrap">
                            <button
                              className={cn("btn-secondary", ACTION_BUTTON_CLASS)}
                              disabled={busy}
                              onClick={() => setCartModal({ open: true, mode: "edit", rule })}
                            >
                              עריכה
                            </button>
                            <button
                              className={cn("btn-outline", ACTION_BUTTON_CLASS)}
                              disabled={busy}
                              onClick={() => setConfirmCartDel({ open: true, rule })}
                            >
                              מחיקה
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                      אין מבצעי סל שמתאימים לסינון הנוכחי.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        ) : null}
        </div>
      </div>

      <PromotionModal
        open={modal.open}
        mode={modal.mode}
        busy={busy}
        promotion={modal.promotion}
        onCancel={() => setModal({ open: false, mode: "create", promotion: null })}
        onSave={onSavePromotion}
      />

      <CartPromotionModal
        open={cartModal.open}
        mode={cartModal.mode}
        busy={busy}
        rule={cartModal.rule}
        onCancel={() => setCartModal({ open: false, mode: "create", rule: null })}
        onSave={onSaveCartRule}
      />

      <ProductGroupPromotionModal
        open={groupModal.open}
        mode={groupModal.mode}
        busy={busy}
        promotion={groupModal.promotion}
        onCancel={() => setGroupModal({ open: false, mode: "create", promotion: null })}
        onSave={onSaveGroupPromotion}
      />

      <ConfirmDeleteModal
        open={confirmDel.open}
        busy={busy}
        title="מחיקת מבצע"
        text={
          confirmDel.promotion
            ? `למחוק את המבצע על "${confirmDel.promotion.product_name || `#${confirmDel.promotion.product_id}`}"?`
            : "למחוק מבצע?"
        }
        hint="לאחר המחיקה המבצע לא יופיע ללקוחות ולא יחושב בהזמנות חדשות. הזמנות קיימות שכבר ננעל להן מחיר לא משתנות."
        onCancel={() => setConfirmDel({ open: false, promotion: null })}
        onConfirm={onConfirmDelete}
      />

      <ConfirmDeleteModal
        open={confirmGroupDel.open}
        busy={busy}
        title="מחיקת מבצע קבוצת מוצרים"
        text={
          confirmGroupDel.promotion
            ? `למחוק את מבצע הקבוצה "${confirmGroupDel.promotion.title || `#${confirmGroupDel.promotion.id}`}"?`
            : "למחוק מבצע קבוצת מוצרים?"
        }
        hint="המחיקה תשפיע על חישוב הזמנות חדשות ועדכונים עתידיים להזמנות פתוחות."
        onCancel={() => setConfirmGroupDel({ open: false, promotion: null })}
        onConfirm={onConfirmGroupDelete}
      />

      <ConfirmDeleteModal
        open={confirmCartDel.open}
        busy={busy}
        title="מחיקת מבצע סל"
        text={
          confirmCartDel.rule
            ? `למחוק את מבצע הסל "${confirmCartDel.rule.title || `#${confirmCartDel.rule.id}`}"?`
            : "למחוק מבצע סל?"
        }
        hint="המחיקה תשפיע על חישוב הזמנות חדשות ועדכונים עתידיים להזמנות פתוחות."
        onCancel={() => setConfirmCartDel({ open: false, rule: null })}
        onConfirm={onConfirmCartDelete}
      />
    </div>
  );
}
