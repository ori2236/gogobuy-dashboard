/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarClock,
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
  usePromotions,
  useStockCategories,
  useUpdateCartPromotionRule,
  useUpdatePromotion,
} from "../lib/hooks";
import { cn, formatDateTime } from "../lib/utils";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { PromotionModal } from "./PromotionModal";
import { CartPromotionModal } from "./CartPromotionModal";

const FILTERS = [
  { value: "all", label: "כל המבצעים" },
  { value: "active", label: "פעילים" },
  { value: "inactive", label: "לא פעילים" },
];

const KIND_LABELS = {
  PERCENT_OFF: "אחוז הנחה",
  AMOUNT_OFF: "הנחה בשקלים",
  FIXED_PRICE: "מחיר קבוע",
  BUNDLE: "כמות במחיר",
};

const CART_RULE_LABELS = {
  DELIVERY_FEE_OVERRIDE: "משלוח לפי סכום סל",
  GIFT_PRODUCT: "מתנה לפי סכום סל",
  THRESHOLD_PRODUCT_FIXED_PRICE: "מחיר מוצר לפי סכום סל",
};

const SORT_OPTIONS = [
  { value: "default:desc", label: "ברירת מחדל" },
  { value: "start_at:desc", label: "תאריך התחלה - מהחדש לישן" },
  { value: "start_at:asc", label: "תאריך התחלה - מהישן לחדש" },
  { value: "end_at:desc", label: "תאריך סיום - מהמאוחר למוקדם" },
  { value: "end_at:asc", label: "תאריך סיום - מהמוקדם למאוחר" },
  { value: "kind:asc", label: "סוג מבצע - א׳ עד ת׳" },
  { value: "kind:desc", label: "סוג מבצע - ת׳ עד א׳" },
];

const CART_SORT_OPTIONS = [
  { value: "default", label: "ברירת מחדל" },
  { value: "type", label: "סוג מבצע + סכום מינימלי" },
  { value: "created_at:desc", label: "תאריך יצירה - מהחדש לישן" },
  { value: "created_at:asc", label: "תאריך יצירה - מהישן לחדש" },
  { value: "end_at:asc", label: "תאריך תפוגה - הקרוב קודם" },
  { value: "end_at:desc", label: "תאריך תפוגה - הרחוק קודם" },
];

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
  return promo?.max_discounted_qty ? `${fmtShortNumber(promo.max_discounted_qty)} יח׳` : "-";
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
  if (rule?.rule_type !== "THRESHOLD_PRODUCT_FIXED_PRICE") return "-";
  return rule.reward_max_qty ? `${fmtShortNumber(rule.reward_max_qty)} יח׳` : "-";
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

function cartRuleIcon(ruleType) {
  if (ruleType === "DELIVERY_FEE_OVERRIDE") return <Truck className="h-4 w-4 text-blue-700" />;
  if (ruleType === "GIFT_PRODUCT") return <Gift className="h-4 w-4 text-emerald-700" />;
  return <ShoppingCart className="h-4 w-4 text-amber-700" />;
}

function statusInfo(promo) {
  const hasCurrentFlag = Object.prototype.hasOwnProperty.call(promo || {}, "is_currently_active");
  const currentlyActive = hasCurrentFlag ? Boolean(promo?.is_currently_active) : Boolean(promo?.is_active);
  if (currentlyActive || promo?.status === "active") {
    return {
      label: "פעיל",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  if (promo?.is_upcoming || promo?.status === "upcoming") {
    return {
      label: "עתידי",
      className: "bg-blue-50 text-blue-700",
    };
  }

  if (promo?.is_expired || promo?.status === "expired") {
    return {
      label: "פג תוקף",
      className: "bg-slate-100 text-slate-600",
    };
  }

  return {
    label: "לא פעיל",
    className: "bg-slate-100 text-slate-600",
  };
}

function dateRangeText(promo) {
  const start = promo?.start_at ? formatDateTime(promo.start_at) : "-";
  const end = promo?.end_at ? formatDateTime(promo.end_at) : "ללא סיום";
  return { start, end };
}

function parseSortValue(sortValue) {
  const [sort_by = "default", sort_dir = "desc"] = String(sortValue || "default:desc").split(":");
  return { sort_by, sort_dir };
}

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
  const [q, setQ] = useState("");
  const [promoTab, setPromoTab] = useState("products");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [sortValue, setSortValue] = useState("default:desc");
  const [cartSortValue, setCartSortValue] = useState("default");
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
  const [confirmCartDel, setConfirmCartDel] = useState({ open: false, rule: null });

  const qDebounced = useDebouncedValue(q, 300);
  const { sort_by, sort_dir } = useMemo(
    () => parseSortValue(sortValue),
    [sortValue],
  );

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

  const createMut = useCreatePromotion();
  const updateMut = useUpdatePromotion();
  const deleteMut = useDeletePromotion();
  const createCartMut = useCreateCartPromotionRule();
  const updateCartMut = useUpdateCartPromotionRule();
  const deleteCartMut = useDeleteCartPromotionRule();

  const busy =
    createMut.isPending ||
    updateMut.isPending ||
    deleteMut.isPending ||
    createCartMut.isPending ||
    updateCartMut.isPending ||
    deleteCartMut.isPending;
  const promotions = promosQuery.data?.promotions || [];
  const cartRules = cartRulesQuery.data?.cart_promotion_rules || [];
  const counts = promosQuery.data?.counts || { total: 0, active: 0, inactive: 0 };
  const cartCounts = cartRulesQuery.data?.counts || { total: 0, active: 0, inactive: 0 };
  const combinedCounts = {
    total: Number(counts.total || 0) + Number(cartCounts.total || 0),
    active: Number(counts.active || 0) + Number(cartCounts.active || 0),
    inactive: Number(counts.inactive || 0) + Number(cartCounts.inactive || 0),
  };

  const refetchFn = useCallback(() => {
    promosQuery.refetch();
    cartRulesQuery.refetch();
  }, [promosQuery.refetch, cartRulesQuery.refetch]);
  useEffect(() => {
    onRegisterRefetch?.(refetchFn);
    return () => onRegisterRefetch?.(null);
  }, [onRegisterRefetch, refetchFn]);

  useEffect(() => {
    onFetchingChange?.(Boolean(promosQuery.isFetching || cartRulesQuery.isFetching || catQuery.isFetching));
  }, [onFetchingChange, promosQuery.isFetching, cartRulesQuery.isFetching, catQuery.isFetching]);

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

    if (cartSortValue === "type") {
      rows.sort((a, b) => {
        const typeCmp = String(CART_RULE_LABELS[a.rule_type] || a.rule_type || "").localeCompare(
          String(CART_RULE_LABELS[b.rule_type] || b.rule_type || ""),
          "he",
        );
        if (typeCmp !== 0) return typeCmp;
        return num(a.threshold_amount) - num(b.threshold_amount);
      });
      return rows;
    }

    if (cartSortValue === "created_at:asc") {
      rows.sort((a, b) => timeValue(a.created_at, 0) - timeValue(b.created_at, 0));
      return rows;
    }

    if (cartSortValue === "created_at:desc") {
      rows.sort((a, b) => timeValue(b.created_at, 0) - timeValue(a.created_at, 0));
      return rows;
    }

    if (cartSortValue === "end_at:asc") {
      rows.sort((a, b) => timeValue(a.end_at, Number.MAX_SAFE_INTEGER) - timeValue(b.end_at, Number.MAX_SAFE_INTEGER));
      return rows;
    }

    if (cartSortValue === "end_at:desc") {
      rows.sort((a, b) => timeValue(b.end_at, 0) - timeValue(a.end_at, 0));
      return rows;
    }

    return rows;
  }, [cartRules, cartSortValue]);

  const isCartTab = promoTab === "cart";
  const currentFilteredCount = isCartTab ? sortedCartRules.length : promotions.length;

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

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2" dir="rtl">
        <button
          type="button"
          onClick={() => setPromoTab("products")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition",
            promoTab === "products"
              ? "bg-slate-950 text-white shadow-sm"
              : "bg-slate-200/70 text-slate-700 hover:bg-slate-200",
          )}
        >
          <BadgePercent className="h-4 w-4" />
          מבצעי מוצרים
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{promotions.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setPromoTab("cart")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition",
            promoTab === "cart"
              ? "bg-emerald-700 text-white shadow-sm"
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
                צפייה, סינון, הוספה, עריכה ומחיקה של מבצעי מוצרים ומבצעי סל. מבצע פעיל נקבע אוטומטית לפי תאריכים והגדרת פעיל.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isCartTab ? (
              <button
                className="btn-success"
                onClick={() =>
                  setCartModal({ open: true, mode: "create", rule: null })
                }
                disabled={busy}
                title="מבצע לפי סכום סל: משלוח מוזל/חינם, מתנה, או מחיר מיוחד למוצר"
              >
                <Plus className="h-4 w-4" />
                הוסף מבצע סל
              </button>
            ) : (
              <button
                className="btn-success"
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
            {!isCartTab ? (
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
                  <div className="text-xs font-bold text-slate-700">מיון</div>
                  <select
                    className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={sortValue}
                    onChange={(e) => setSortValue(e.target.value)}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            {isCartTab ? (
              <div className="sm:col-span-4">
                <div className="text-xs font-bold text-slate-700">מיון</div>
                <select
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={cartSortValue}
                  onChange={(e) => setCartSortValue(e.target.value)}
                >
                  {CART_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className={isCartTab ? "sm:col-span-8" : "sm:col-span-3"}>
              <div className="text-xs font-bold text-slate-700">חיפוש</div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  className="w-full rounded-2xl bg-white ps-10 pe-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={isCartTab ? "שם מבצע סל / תיאור" : "שם מוצר / תיאור / שם באנגלית"}
                />
              </div>
            </div>
          </div>

          {!isCartTab && catQuery.isLoading ? (
            <div className="mt-3 text-sm text-slate-600">טוען קטגוריות…</div>
          ) : !isCartTab && catQuery.error ? (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">
              שגיאה בטעינת קטגוריות: {String(catQuery.error?.message || "")}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2" dir="rtl">
          <span className="pill bg-amber-50 text-amber-700">
            {activeFilterLabel}: {currentFilteredCount}
          </span>
          {!isCartTab && category ? (
            <span className="pill bg-slate-100 text-slate-700">
              קטגוריה: {category}
            </span>
          ) : null}
          {!isCartTab && subCategory ? (
            <span className="pill bg-slate-100 text-slate-700">
              תת-קטגוריה: {subCategory}
            </span>
          ) : null}
        </div>

        {!isCartTab ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-700">
                <tr>
                  <th className="px-4 py-3">מוצר</th>
                  <th className="px-4 py-3">קטגוריה</th>
                  <th className="px-4 py-3">סוג</th>
                  <th className="px-4 py-3">ערך</th>
                  <th className="px-4 py-3">תיאור</th>
                  <th className="px-4 py-3">תוקף</th>
                  <th className="px-3 py-3">סטטוס</th>
                  <th className="px-3 py-3">פעולות</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {promosQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                      טוען מבצעים…
                    </td>
                  </tr>
                ) : promosQuery.error ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-rose-700" colSpan={8}>
                      שגיאה בטעינת מבצעים: {String(promosQuery.error?.message || "")}
                    </td>
                  </tr>
                ) : promotions.length ? (
                  promotions.map((promo) => {
                    const s = statusInfo(promo);
                    const dates = dateRangeText(promo);
                    return (
                      <tr key={promo.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">
                          <div className="font-bold">{promo.product_name || `#${promo.product_id}`}</div>
                          <div className="mt-1 text-xs text-slate-500" dir="ltr">
                            {promo.product_display_name_en || "-"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            מחיר מוצר: {fmtMoney(promo.product_price)}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div>{promo.product_category || "-"}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {promo.product_sub_category || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {KIND_LABELS[promo.kind] || promo.kind || "-"}
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div>{promoValueText(promo)}</div>
                          {promo?.max_discounted_qty ? (
                            <div className="mt-2 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-700">
                              מקסימום {promoMaxText(promo)} במבצע
                            </div>
                          ) : null}
                        </td>

                        <td className="max-w-[320px] px-4 py-3 text-slate-700">
                          <div className="line-clamp-3">
                            {promo.description || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div className="flex items-start justify-end gap-2">
                            <CalendarClock className="mt-0.5 h-4 w-4 text-slate-400" />
                            <div>
                              <div>מתחיל: {dates.start}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                מסתיים: {dates.end}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <span className={cn("pill", s.className)}>{s.label}</span>
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex flex-col items-stretch justify-end gap-2 whitespace-nowrap">
                            <button
                              className="btn-secondary"
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
                              className="btn-outline"
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
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={8}>
                      אין מבצעים שמתאימים לסינון הנוכחי.
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-white text-xs font-extrabold text-slate-700">
                <tr>
                  <th className="px-4 py-3">סוג</th>
                  <th className="px-4 py-3">שם המבצע</th>
                  <th className="px-4 py-3">סכום מינימלי</th>
                  <th className="px-4 py-3">הטבה</th>
                  <th className="px-4 py-3">תוקף</th>
                  <th className="px-3 py-3">סטטוס</th>
                  <th className="px-3 py-3">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cartRulesQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>טוען מבצעי סל…</td>
                  </tr>
                ) : cartRulesQuery.error ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-rose-700" colSpan={7}>
                      שגיאה בטעינת מבצעי סל: {String(cartRulesQuery.error?.message || "")}
                    </td>
                  </tr>
                ) : sortedCartRules.length ? (
                  sortedCartRules.map((rule) => {
                    const s = statusInfo(rule);
                    const dates = dateRangeText(rule);
                    return (
                      <tr key={rule.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          <div className="flex items-center justify-end gap-2">
                            <span>{CART_RULE_LABELS[rule.rule_type] || rule.rule_type}</span>
                            {cartRuleIcon(rule.rule_type)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          <div className="font-bold">{rule.title || `#${rule.id}`}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          בקנייה מעל {cartRuleThresholdText(rule)}
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-900">
                          <div>{cartRuleBenefitText(rule)}</div>
                          {rule?.rule_type === "THRESHOLD_PRODUCT_FIXED_PRICE" && rule?.reward_max_qty ? (
                            <div className="mt-2 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-700">
                              מקסימום {cartRuleMaxText(rule)} במבצע
                            </div>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div>מתחיל: {dates.start}</div>
                          <div className="mt-1 text-xs text-slate-500">מסתיים: {dates.end}</div>
                        </td>
                        <td className="px-3 py-3"><span className={cn("pill", s.className)}>{s.label}</span></td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-stretch justify-end gap-2 whitespace-nowrap">
                            <button
                              className="btn-secondary"
                              disabled={busy}
                              onClick={() => setCartModal({ open: true, mode: "edit", rule })}
                            >
                              עריכה
                            </button>
                            <button
                              className="btn-outline"
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
                    <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
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
