/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgePercent, PackageSearch, Pencil, RefreshCw, X } from "lucide-react";
import { useStockProductsInfinite } from "../lib/hooks";

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

function todayDateLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MARKET_DAY_DESCRIPTION = "מבצע יום השוק";

function nearestTuesdayDateLocal() {
  const d = new Date();
  const daysUntilTuesday = (2 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntilTuesday);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isExistingMarketDay(promotion) {
  return Boolean(promotion?.is_market_day) || String(promotion?.description || "").trim() === MARKET_DAY_DESCRIPTION;
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
  if (!d) return "";
  const t = String(time || "00:00").trim() || "00:00";
  return `${d}T${t}`;
}

function productLabel(product) {
  if (!product) return "";
  return product.name || `#${product.id}`;
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

export function ProductGroupPromotionModal({ open, mode, busy, promotion, onCancel, onSave, marketDayEnabled = false }) {
  const isEdit = mode === "edit";
  const productSearchBoxRef = useRef(null);

  const [title, setTitle] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [productSearchFocused, setProductSearchFocused] = useState(false);
  const [bundleBuyQty, setBundleBuyQty] = useState("2");
  const [bundlePayPrice, setBundlePayPrice] = useState("");
  const [maxDiscountedQty, setMaxDiscountedQty] = useState("");
  const [priority, setPriority] = useState("100");
  const [description, setDescription] = useState("");
  const [isMarketDay, setIsMarketDay] = useState(false);
  const [startDate, setStartDate] = useState(todayDateLocal());
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59:59");
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedProductsOpen, setSelectedProductsOpen] = useState(true);

  const debouncedSearch = useDebouncedValue(productSearch, 120);
  const cleanSearch = String(debouncedSearch || "").trim();
  const canSearch = open && cleanSearch.length >= 2;
  const selectedIds = useMemo(
    () => new Set(selectedProducts.map((p) => Number(p.id)).filter(Boolean)),
    [selectedProducts],
  );

  const productQuery = useStockProductsInfinite({
    q: cleanSearch,
    category: null,
    sub_category: null,
    enabled: canSearch,
  });

  const productResults = useMemo(() => {
    const pages = productQuery.data?.pages || [];
    const all = [];
    for (const page of pages) {
      for (const product of page.products || []) {
        if (!selectedIds.has(Number(product.id))) all.push(product);
      }
    }
    return all.slice(0, 10);
  }, [productQuery.data, selectedIds]);

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setProductSearch("");
    setProductSearchFocused(false);
    setSelectedProductsOpen(true);

    if (isEdit && promotion) {
      const start = splitDateTime(promotion.start_at);
      const end = splitDateTime(promotion.end_at);
      setTitle(promotion.title || "");
      setSelectedProducts(Array.isArray(promotion.products) ? promotion.products : []);
      setBundleBuyQty(String(promotion.bundle_buy_qty || 2));
      setBundlePayPrice(promotion.bundle_pay_price == null ? "" : String(promotion.bundle_pay_price));
      setMaxDiscountedQty(promotion.max_discounted_qty == null ? "" : String(promotion.max_discounted_qty));
      setPriority(String(promotion.priority || 100));
      const marketDay = isExistingMarketDay(promotion);
      const marketDate = marketDay ? (start.date || nearestTuesdayDateLocal()) : null;
      setIsMarketDay(marketDay);
      setDescription(marketDay ? MARKET_DAY_DESCRIPTION : (promotion.description || ""));
      setStartDate(marketDay ? marketDate : (start.date || todayDateLocal()));
      setStartTime("00:00");
      setEndDate(marketDay ? marketDate : (end.date || ""));
      setEndTime("23:59:59");
    } else {
      setTitle("");
      setSelectedProducts([]);
      setBundleBuyQty("2");
      setBundlePayPrice("");
      setMaxDiscountedQty("");
      setPriority("100");
      setIsMarketDay(false);
      setDescription("");
      setStartDate(todayDateLocal());
      setStartTime("00:00");
      setEndDate("");
      setEndTime("23:59:59");
    }
  }, [open, isEdit, promotion]);

  useEffect(() => {
    if (!open || !productSearchFocused) return undefined;

    function handlePointerDown(event) {
      const box = productSearchBoxRef.current;
      if (!box || box.contains(event.target)) return;
      setProductSearchFocused(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, productSearchFocused]);

  useEffect(() => {
    if (!open || !marketDayEnabled || !isMarketDay) return;
    const existingDate = isEdit && isExistingMarketDay(promotion)
      ? splitDateTime(promotion?.start_at).date
      : "";
    const marketDate = existingDate || nearestTuesdayDateLocal();
    setDescription(MARKET_DAY_DESCRIPTION);
    setStartDate(marketDate);
    setStartTime("00:00");
    setEndDate(marketDate);
    setEndTime("23:59:59");
  }, [open, marketDayEnabled, isMarketDay, isEdit, promotion]);

  if (!open) return null;

  const showProductDropdown = productSearchFocused && canSearch;

  function selectProduct(product) {
    if (!product || selectedIds.has(Number(product.id))) return;
    setSelectedProducts((prev) => [...prev, product]);
    setProductSearchFocused(true);
    setSelectedProductsOpen(true);
    setFieldErrors((prev) => ({ ...prev, product_ids: "" }));
  }

  function addAllVisibleProducts() {
    if (!productResults.length) return;
    setSelectedProducts((prev) => {
      const ids = new Set(prev.map((p) => Number(p.id)).filter(Boolean));
      const additions = productResults.filter((p) => p && !ids.has(Number(p.id)));
      return additions.length ? [...prev, ...additions] : prev;
    });
    setProductSearchFocused(true);
    setSelectedProductsOpen(true);
    setFieldErrors((prev) => ({ ...prev, product_ids: "" }));
  }

  function removeProduct(productId) {
    setSelectedProducts((prev) => prev.filter((p) => Number(p.id) !== Number(productId)));
  }

  function clearSelectedProducts() {
    if (!selectedProducts.length) return;
    if (selectedProducts.length > 3 && !window.confirm("לנקות את כל המוצרים שנבחרו למבצע?")) return;
    setSelectedProducts([]);
    setFieldErrors((prev) => ({ ...prev, product_ids: "צריך לבחור לפחות 2 מוצרים בקבוצה" }));
  }

  function validate() {
    const errors = {};
    const startAt = combineDateTime(startDate, startTime);
    const endAt = combineDateTime(endDate, endTime);

    if (!String(title || "").trim()) errors.title = "צריך שם למבצע";
    if (selectedProducts.length < 2) errors.product_ids = "צריך לבחור לפחות 2 מוצרים בקבוצה";
    if (!startDate) errors.start_at = "תאריך התחלה חובה";
        if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      errors.end_at = "תאריך הסיום חייב להיות אחרי תאריך ההתחלה";
    }

    const qty = Number(bundleBuyQty);
    const price = numberValue(bundlePayPrice);
    if (!Number.isInteger(qty) || qty < 2) errors.bundle_buy_qty = "כמות במבצע חייבת להיות מספר שלם מ-2 ומעלה";
    if (price === null || price <= 0) errors.bundle_pay_price = "מחיר השילוב חייב להיות גדול מ-0";

    if (String(maxDiscountedQty || "").trim()) {
      const maxQty = numberValue(maxDiscountedQty);
      if (maxQty === null || maxQty <= 0) errors.max_discounted_qty = "מקסימום במבצע חייב להיות גדול מ-0";
    }

    const pri = Number(priority);
    if (!Number.isInteger(pri) || pri < 1) errors.priority = "עדיפות חייבת להיות מספר שלם חיובי";

    return errors;
  }

  function submit() {
    const errors = validate();
    if (Object.values(errors).some(Boolean)) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      title: title.trim(),
      product_ids: selectedProducts.map((p) => Number(p.id)).filter(Boolean),
      bundle_buy_qty: Number(bundleBuyQty),
      bundle_pay_price: Number(bundlePayPrice),
      max_discounted_qty: String(maxDiscountedQty || "").trim() ? Number(maxDiscountedQty) : null,
      priority: Number(priority || 100),
      is_active: true,
      description: marketDayEnabled && isMarketDay ? MARKET_DAY_DESCRIPTION : (description.trim() || null),
      start_at: combineDateTime(startDate, startTime),
      end_at: endDate ? combineDateTime(endDate, endTime) : null,
    };

    if (marketDayEnabled) payload.is_market_day = isMarketDay;

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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
              {isEdit ? <Pencil className="h-6 w-6" /> : <BadgePercent className="h-6 w-6" />}
            </div>

            <div className="min-w-0 flex-1 text-right">
              <div className="text-xl font-extrabold leading-tight">
                {isEdit ? "עריכת מבצע קבוצת מוצרים" : "הוספת מבצע קבוצת מוצרים"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                מבצעים שמאפשרים לשלב כמה מוצרים שונים מאותה קבוצה.
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-200 p-4">
            <div className="grid gap-4 sm:grid-cols-12">
              <InputShell label="שם המבצע" error={fieldErrors.title} className="sm:col-span-12">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="לדוגמה: בן אנד גריס - 2 ב-39.90"
                />
              </InputShell>


              <InputShell label="מוצרים בקבוצה" error={fieldErrors.product_ids} className="relative z-30 sm:col-span-12">
                <div className="mt-2 flex items-center gap-2" ref={productSearchBoxRef}>
                  <div className="relative min-w-0 flex-1">
                    <div className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-400">
                      <PackageSearch className="h-4 w-4" />
                    </div>
                    <input
                      className="w-full rounded-2xl bg-white ps-10 pe-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                      value={productSearch}
                      onFocus={() => setProductSearchFocused(true)}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setProductSearchFocused(true);
                      }}
                      placeholder="חפש מוצר להוספה לקבוצה"
                    />

                    {showProductDropdown ? (
                      <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-72 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                          <span>לחיצה על מוצר מוסיפה אותו לקבוצה והרשימה נשארת פתוחה</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-full bg-purple-50 px-3 py-1 text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={!productResults.length || productQuery.isLoading || productQuery.isFetching}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={addAllVisibleProducts}
                            >
                              הוסף את כל התוצאות
                            </button>
                            <button
                              type="button"
                              className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setProductSearchFocused(false)}
                            >
                              סגור
                            </button>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-auto">
                        {productQuery.isLoading || productQuery.isFetching ? (
                          <div className="p-3 text-sm text-slate-500">מחפש מוצרים…</div>
                        ) : productQuery.error ? (
                          <div className="p-3 text-sm text-rose-700">
                            שגיאה בחיפוש מוצרים: {String(productQuery.error?.message || "")}
                          </div>
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
                                  <span className="block truncate font-bold text-slate-900">
                                    {product.name || `#${product.id}`}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-slate-500" dir="ltr">
                                    {product.display_name_en || "—"}
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">
                                  #{product.id}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-sm text-slate-500">לא נמצאו מוצרים</div>
                        )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="h-10 shrink-0 rounded-2xl bg-white px-4 text-xs font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    onClick={() => setSelectedProductsOpen((prev) => !prev)}
                  >
                    {selectedProductsOpen ? "הסתר נבחרים" : `הצג נבחרים (${selectedProducts.length})`}
                  </button>
                </div>

                {selectedProducts.length > 0 && selectedProductsOpen ? (
                  <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-extrabold text-slate-600">נבחרו {selectedProducts.length} מוצרים</span>
                      <button
                        type="button"
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 hover:bg-slate-200"
                        onClick={clearSelectedProducts}
                      >
                        נקה הכל
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto rounded-2xl bg-slate-50 p-2">
                      <div className="flex flex-wrap gap-2">
                        {selectedProducts.map((product) => (
                          <span
                            key={product.id}
                            className="inline-flex max-w-full items-center gap-2 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-800"
                          >
                            <span className="truncate">{productLabel(product)}</span>
                            <button
                              type="button"
                              className="rounded-full p-0.5 hover:bg-purple-100"
                              onClick={() => removeProduct(product.id)}
                              title="הסר מוצר"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </InputShell>

              <InputShell label="כמות לשילוב" error={fieldErrors.bundle_buy_qty} className="sm:col-span-4">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={bundleBuyQty}
                  onChange={(e) => setBundleBuyQty(e.target.value)}
                  inputMode="numeric"
                  placeholder="לדוגמה: 2"
                />
              </InputShell>

              <InputShell label="מחיר לשילוב" error={fieldErrors.bundle_pay_price} className="sm:col-span-4">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={bundlePayPrice}
                  onChange={(e) => setBundlePayPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="לדוגמה: 39.90"
                />
              </InputShell>

              <InputShell label="מקסימום שימושים במבצע" error={fieldErrors.max_discounted_qty} className="sm:col-span-4">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={maxDiscountedQty}
                  onChange={(e) => setMaxDiscountedQty(e.target.value)}
                  inputMode="decimal"
                  placeholder="ריק = ללא הגבלה"
                />

              </InputShell>

              <InputShell label="עדיפות" error={fieldErrors.priority} className="sm:col-span-3">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  inputMode="numeric"
                  placeholder="100"
                />
                <div className="mt-1 text-xs text-slate-500">מספר נמוך יותר מחושב קודם.</div>
              </InputShell>

              {marketDayEnabled ? (
              <div className="sm:col-span-12 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm font-extrabold text-amber-950">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-amber-300"
                    checked={isMarketDay}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsMarketDay(checked);
                      if (!checked) setDescription("");
                    }}
                  />
                  <span>
                    מבצע יום השוק
                    <span className="mt-1 block text-xs font-semibold text-amber-800">
                      התיאור והתאריכים יינעלו אוטומטית ליום שלישי הקרוב.
                    </span>
                  </span>
                </label>
              </div>
              ) : null}

              <InputShell label="תאריך התחלה" error={fieldErrors.start_at} className="sm:col-span-4">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  type="date"
                  disabled={marketDayEnabled && isMarketDay}
                />
              </InputShell>

              <InputShell label="תאריך סיום" error={fieldErrors.end_at} className="sm:col-span-4">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (e.target.value && !endTime) setEndTime("23:59:59");
                  }}
                  type="date"
                  disabled={marketDayEnabled && isMarketDay}
                />
              </InputShell>

              <InputShell label="תיאור" error="" className="sm:col-span-12">
                <textarea
                  className="mt-2 min-h-20 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                  value={description}
                  disabled={marketDayEnabled && isMarketDay}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="לדוגמה: כל טעמי בן אנד גריס משתתפים במבצע ואפשר לשלב ביניהם"
                />
              </InputShell>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-outline" onClick={onCancel} disabled={busy}>
              ביטול
            </button>

            <button className="btn-success" onClick={submit} disabled={busy}>
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "שמור שינויים" : "הוסף מבצע"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
