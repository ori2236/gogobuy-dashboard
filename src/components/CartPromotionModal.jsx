/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { Gift, PackageSearch, Pencil, RefreshCw, ShoppingCart, Truck } from "lucide-react";
import { useStockProductsInfinite } from "../lib/hooks";

const RULE_LABELS = {
  DELIVERY_FEE_OVERRIDE: "מבצע משלוח לפי סכום סל",
  GIFT_PRODUCT: "מתנה לפי סכום סל",
  THRESHOLD_PRODUCT_FIXED_PRICE: "מחיר מיוחד למוצר לפי סכום סל",
};

function useDebouncedValue(value, delayMs = 120) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function splitDateTime(value) {
  if (!value) return { date: "", time: "00:00" };
  const s = String(value);
  const direct = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (direct && !s.includes("Z")) return { date: direct[1], time: direct[2] };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "00:00" };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function combineDateTime(date, time) {
  const d = String(date || "").trim();
  if (!d) return null;
  const t = String(time || "00:00").trim() || "00:00";
  return `${d}T${t}`;
}

function todayDateLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function productLabel(product) {
  if (!product) return "";
  const name = product.name || `#${product.id}`;
  const en = product.display_name_en ? ` · ${product.display_name_en}` : "";
  return `${name}${en}`;
}

function productLabelFromRule(rule) {
  if (!rule?.reward_product_id) return String(rule?.gift_text || "").trim();
  const name = rule.reward_product_name || `#${rule.reward_product_id}`;
  const en = rule.reward_display_name_en ? ` · ${rule.reward_display_name_en}` : "";
  return `${name}${en}`;
}

function numberValue(value) {
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function FieldError({ children }) {
  if (!children) return null;
  return <div className="mt-1 text-xs font-semibold text-rose-700">{children}</div>;
}

function InputShell({ label, error, children, className = "" }) {
  return (
    <div className={className}>
      <div className="text-xs font-bold text-slate-700">{label}</div>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function RuleIcon({ ruleType, className = "h-6 w-6" }) {
  if (ruleType === "DELIVERY_FEE_OVERRIDE") return <Truck className={className} />;
  if (ruleType === "GIFT_PRODUCT") return <Gift className={className} />;
  return <ShoppingCart className={className} />;
}

export function CartPromotionModal({ open, mode, busy, rule, onCancel, onSave }) {
  const isEdit = mode === "edit";
  const [ruleType, setRuleType] = useState("DELIVERY_FEE_OVERRIDE");
  const [thresholdAmount, setThresholdAmount] = useState("");
  const [deliveryFeeOverride, setDeliveryFeeOverride] = useState("");
  const [rewardProductId, setRewardProductId] = useState("");
  const [rewardProductSearch, setRewardProductSearch] = useState("");
  const [productSearchFocused, setProductSearchFocused] = useState(false);
  const [rewardQty, setRewardQty] = useState("1");
  const [rewardFixedPrice, setRewardFixedPrice] = useState("");
  const [rewardMaxQty, setRewardMaxQty] = useState("");
  const [thresholdBaseMode, setThresholdBaseMode] = useState("ITEMS_SUBTOTAL");
  const [priority, setPriority] = useState("100");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59:59");
  const [fieldErrors, setFieldErrors] = useState({});

  const usesRewardProductSearch =
    ruleType === "GIFT_PRODUCT" || ruleType === "THRESHOLD_PRODUCT_FIXED_PRICE";
  const requiresRewardProduct = ruleType === "THRESHOLD_PRODUCT_FIXED_PRICE";
  const debouncedSearch = useDebouncedValue(rewardProductSearch, 120);
  const cleanSearch = String(debouncedSearch || "").trim();
  const canSearch = open && usesRewardProductSearch && cleanSearch.length >= 2;

  const productQuery = useStockProductsInfinite({
    q: cleanSearch,
    category: null,
    sub_category: null,
    enabled: canSearch && !rewardProductId,
  });

  const productResults = useMemo(() => {
    const pages = productQuery.data?.pages || [];
    const all = [];
    for (const page of pages) {
      for (const product of page.products || []) all.push(product);
    }
    return all.slice(0, 8);
  }, [productQuery.data]);

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setProductSearchFocused(false);

    if (isEdit && rule) {
      const start = splitDateTime(rule.start_at);
      const end = splitDateTime(rule.end_at);
      setRuleType(rule.rule_type || "DELIVERY_FEE_OVERRIDE");
      setThresholdAmount(rule.threshold_amount == null ? "" : String(rule.threshold_amount));
      setDeliveryFeeOverride(
        rule.delivery_fee_override == null ? "" : String(rule.delivery_fee_override),
      );
      setRewardProductId(rule.reward_product_id == null ? "" : String(rule.reward_product_id));
      setRewardProductSearch(productLabelFromRule(rule));
      setRewardQty(rule.reward_qty == null ? "1" : String(rule.reward_qty));
      setRewardFixedPrice(
        rule.reward_fixed_price == null ? "" : String(rule.reward_fixed_price),
      );
      setRewardMaxQty(rule.reward_max_qty == null ? "" : String(rule.reward_max_qty));
      setThresholdBaseMode(rule.threshold_base_mode || "ITEMS_SUBTOTAL");
      setPriority(rule.priority == null ? "100" : String(rule.priority));
      setStartDate(start.date || "");
      setStartTime("00:00");
      setEndDate(end.date || "");
      setEndTime("23:59:59");
    } else {
      setRuleType("DELIVERY_FEE_OVERRIDE");
      setThresholdAmount("");
      setDeliveryFeeOverride("");
      setRewardProductId("");
      setRewardProductSearch("");
      setRewardQty("1");
      setRewardFixedPrice("");
      setRewardMaxQty("");
      setThresholdBaseMode("ITEMS_SUBTOTAL");
      setPriority("100");
      setStartDate(todayDateLocal());
      setStartTime("00:00");
      setEndDate("");
      setEndTime("23:59:59");
    }
  }, [open, isEdit, rule]);

  if (!open) return null;

  const showProductDropdown = productSearchFocused && canSearch && !rewardProductId;

  function selectProduct(product) {
    setRewardProductId(String(product.id));
    setRewardProductSearch(productLabel(product));
    setProductSearchFocused(false);
    setFieldErrors((prev) => ({ ...prev, reward_product_id: "" }));
  }

  function handleRuleTypeChange(nextType) {
    setRuleType(nextType);
    setFieldErrors({});
    if (nextType === "DELIVERY_FEE_OVERRIDE") {
      setRewardProductId("");
      setRewardProductSearch("");
      setRewardQty("1");
      setRewardFixedPrice("");
      setRewardMaxQty("");
    }
    if (nextType === "GIFT_PRODUCT") {
      setDeliveryFeeOverride("");
      setRewardFixedPrice("");
      setRewardMaxQty("");
      if (!rewardQty) setRewardQty("1");
    }
    if (nextType === "THRESHOLD_PRODUCT_FIXED_PRICE") {
      setDeliveryFeeOverride("");
      setRewardQty("1");
    }
  }

  function validate() {
    const errors = {};
    const threshold = numberValue(thresholdAmount);
    const startAt = combineDateTime(startDate, startTime);
    const endAt = combineDateTime(endDate, endTime);

    if (!ruleType) errors.rule_type = "צריך לבחור סוג מבצע סל";
    if (threshold === null || threshold < 0) errors.threshold_amount = "סכום סל לא תקין";
    if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      errors.end_at = "תאריך הסיום חייב להיות אחרי תאריך ההתחלה";
    }

    if (ruleType === "DELIVERY_FEE_OVERRIDE") {
      const fee = numberValue(deliveryFeeOverride);
      if (fee === null || fee < 0) errors.delivery_fee_override = "דמי משלוח לא תקינים";
    }

    if (requiresRewardProduct) {
      const pid = Number(rewardProductId);
      if (!Number.isInteger(pid) || pid <= 0) errors.reward_product_id = "צריך לבחור מוצר";
    }

    if (ruleType === "GIFT_PRODUCT") {
      const giftText = String(rewardProductSearch || "").trim();
      if (!rewardProductId && !giftText) errors.reward_product_id = "צריך לבחור מוצר או לכתוב מתנה";
      const qty = numberValue(rewardQty);
      if (qty === null || qty <= 0) errors.reward_qty = "כמות מתנה חייבת להיות גדולה מ-0";
    }

    if (ruleType === "THRESHOLD_PRODUCT_FIXED_PRICE") {
      const price = numberValue(rewardFixedPrice);
      if (price === null || price < 0) errors.reward_fixed_price = "מחיר מיוחד לא תקין";
      if (String(rewardMaxQty || "").trim()) {
        const maxQty = numberValue(rewardMaxQty);
        if (maxQty === null || maxQty <= 0) {
          errors.reward_max_qty = "מקסימום יחידות חייב להיות גדול מ-0";
        }
      }
    }


    return errors;
  }

  function submit() {
    const errors = validate();
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      rule_type: ruleType,
      title: null,
      description: null,
      threshold_amount: Number(thresholdAmount),
      threshold_base_mode: thresholdBaseMode,
      priority: Number(priority),
      is_active: true,
      notify_customer: true,
      start_at: startDate ? combineDateTime(startDate, startTime) : null,
      end_at: endDate ? combineDateTime(endDate, endTime) : null,
    };

    if (ruleType === "DELIVERY_FEE_OVERRIDE") {
      payload.delivery_fee_override = Number(deliveryFeeOverride);
    }

    if (ruleType === "GIFT_PRODUCT") {
      payload.reward_product_id = rewardProductId ? Number(rewardProductId) : null;
      payload.gift_text = rewardProductId ? null : String(rewardProductSearch || "").trim();
      payload.reward_qty = Number(rewardQty);
    }

    if (ruleType === "THRESHOLD_PRODUCT_FIXED_PRICE") {
      payload.reward_product_id = Number(rewardProductId);
      payload.reward_fixed_price = Number(rewardFixedPrice);
      payload.reward_max_qty = String(rewardMaxQty || "").trim() ? Number(rewardMaxQty) : null;
    }

    onSave?.(payload);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="max-h-[92vh] overflow-y-auto p-6" dir="rtl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              {isEdit ? <Pencil className="h-6 w-6" /> : <RuleIcon ruleType={ruleType} />}
            </div>

            <div className="min-w-0 flex-1 text-right">
              <div className="text-xl font-extrabold leading-tight">
                {isEdit ? "עריכת מבצע סל" : "הוספת מבצע סל"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                מבצע שמופעל לפי סכום הסל: משלוח מוזל/חינם, מתנה, או מחיר מיוחד למוצר.
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-200 p-4">
            <div className="grid gap-4 sm:grid-cols-12">
              <InputShell label="סוג מבצע סל" error={fieldErrors.rule_type} className="sm:col-span-6">
                <select
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={ruleType}
                  onChange={(e) => handleRuleTypeChange(e.target.value)}
                >
                  {Object.entries(RULE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </InputShell>

              <InputShell label="סכום סל מינימלי" error={fieldErrors.threshold_amount} className="sm:col-span-6">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={thresholdAmount}
                  onChange={(e) => setThresholdAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="לדוגמה: 300"
                />
              </InputShell>


              {ruleType === "DELIVERY_FEE_OVERRIDE" ? (
                <InputShell label="דמי משלוח אחרי המבצע" error={fieldErrors.delivery_fee_override} className="sm:col-span-4">
                  <input
                    className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={deliveryFeeOverride}
                    onChange={(e) => setDeliveryFeeOverride(e.target.value)}
                    inputMode="decimal"
                    placeholder="0 למשלוח חינם, או 10 למשלוח מוזל"
                  />
                </InputShell>
              ) : null}

              {usesRewardProductSearch ? (
                <InputShell label={ruleType === "GIFT_PRODUCT" ? "מתנה" : "מוצר למחיר מיוחד"} error={fieldErrors.reward_product_id} className="relative z-30 sm:col-span-8">
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-400">
                      <PackageSearch className="h-4 w-4" />
                    </div>
                    <input
                      className="w-full rounded-2xl bg-white ps-10 pe-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                      value={rewardProductSearch}
                      onFocus={() => setProductSearchFocused(true)}
                      onBlur={() => setTimeout(() => setProductSearchFocused(false), 120)}
                      onChange={(e) => {
                        setRewardProductSearch(e.target.value);
                        setRewardProductId("");
                        setFieldErrors((prev) => ({ ...prev, reward_product_id: "" }));
                      }}
                      placeholder={ruleType === "GIFT_PRODUCT" ? "חפש מוצר מהמלאי או כתוב טקסט חופשי" : "חפש מוצר לפי שם / שם באנגלית"}
                    />

                    {showProductDropdown ? (
                      <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-100 bg-white shadow-xl">
                        {productQuery.isLoading || productQuery.isFetching ? (
                          <div className="p-3 text-sm text-slate-500">מחפש מוצרים…</div>
                        ) : productQuery.error ? (
                          <div className="p-3 text-sm text-rose-700">שגיאה בחיפוש מוצרים: {String(productQuery.error?.message || "")}</div>
                        ) : productResults.length ? (
                          <div className="divide-y divide-slate-100">
                            {productResults.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right text-sm hover:bg-slate-50"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectProduct(product)}
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-bold text-slate-900">{product.name || `#${product.id}`}</span>
                                  <span className="mt-0.5 block truncate text-xs text-slate-500" dir="ltr">{product.display_name_en || "-"}</span>
                                </span>
                                <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">#{product.id}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-sm text-slate-500">לא נמצאו מוצרים</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </InputShell>
              ) : null}

              {ruleType === "GIFT_PRODUCT" ? (
                <InputShell label="כמות מתנה" error={fieldErrors.reward_qty} className="sm:col-span-4">
                  <input
                    className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={rewardQty}
                    onChange={(e) => setRewardQty(e.target.value)}
                    inputMode="decimal"
                    placeholder="לדוגמה: 1"
                  />
                </InputShell>
              ) : null}

              {ruleType === "THRESHOLD_PRODUCT_FIXED_PRICE" ? (
                <>
                  <InputShell label="מחיר מיוחד" error={fieldErrors.reward_fixed_price} className="sm:col-span-4">
                    <input
                      className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                      value={rewardFixedPrice}
                      onChange={(e) => setRewardFixedPrice(e.target.value)}
                      inputMode="decimal"
                      placeholder="לדוגמה: 39.90"
                    />
                  </InputShell>

                  <InputShell label="מקסימום יחידות במחיר המיוחד" error={fieldErrors.reward_max_qty} className="sm:col-span-4">
                    <input
                      className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                      value={rewardMaxQty}
                      onChange={(e) => setRewardMaxQty(e.target.value)}
                      inputMode="decimal"
                      placeholder="ריק = -"
                    />
                  </InputShell>

                  <InputShell label="איך לחשב את סכום הסל" error="" className="sm:col-span-4">
                    <select
                      className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                      value={thresholdBaseMode}
                      onChange={(e) => setThresholdBaseMode(e.target.value)}
                    >
                      <option value="ITEMS_SUBTOTAL">כולל כל המוצרים בסל</option>
                      <option value="EXCLUDING_REWARD_PRODUCTS">לא כולל את מוצר המבצע עצמו</option>
                    </select>
                  </InputShell>
                </>
              ) : null}

              <InputShell label="תאריך התחלה" error="" className="sm:col-span-3">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  type="date"
                />
              </InputShell>

              <InputShell label="תאריך סיום" error={fieldErrors.end_at} className="sm:col-span-3">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  type="date"
                />
              </InputShell>

            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-outline" onClick={onCancel} disabled={busy}>ביטול</button>
            <button className="btn-success" onClick={submit} disabled={busy}>
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "שמור שינויים" : "הוסף מבצע סל"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
