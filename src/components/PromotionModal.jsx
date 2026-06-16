/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { BadgePercent, PackageSearch, Pencil, RefreshCw } from "lucide-react";
import { useStockProductsInfinite } from "../lib/hooks";

const KIND_LABELS = {
  PERCENT_OFF: "אחוז הנחה",
  AMOUNT_OFF: "הנחה בשקלים",
  FIXED_PRICE: "מחיר קבוע",
  BUNDLE: "כמות במחיר",
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

function todayDateLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const name = product.name || `#${product.id}`;
  const en = product.display_name_en ? ` · ${product.display_name_en}` : "";
  return `${name}${en}`;
}

function productLabelFromPromotion(promotion) {
  if (!promotion) return "";
  const name = promotion.product_name || `#${promotion.product_id}`;
  const en = promotion.product_display_name_en
    ? ` · ${promotion.product_display_name_en}`
    : "";
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

export function PromotionModal({ open, mode, busy, promotion, onCancel, onSave }) {
  const isEdit = mode === "edit";

  const [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productSearchFocused, setProductSearchFocused] = useState(false);
  const [kind, setKind] = useState("PERCENT_OFF");
  const [percentOff, setPercentOff] = useState("");
  const [amountOff, setAmountOff] = useState("");
  const [fixedPrice, setFixedPrice] = useState("");
  const [bundleBuyQty, setBundleBuyQty] = useState("");
  const [bundlePayPrice, setBundlePayPrice] = useState("");
  const [maxDiscountedQty, setMaxDiscountedQty] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayDateLocal());
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59:59");
  const [fieldErrors, setFieldErrors] = useState({});

  const debouncedSearch = useDebouncedValue(productSearch, 120);
  const cleanSearch = String(debouncedSearch || "").trim();
  const canSearch = open && cleanSearch.length >= 2;

  const productQuery = useStockProductsInfinite({
    q: cleanSearch,
    category: null,
    sub_category: null,
    enabled: canSearch && !productId,
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

    if (isEdit && promotion) {
      const start = splitDateTime(promotion.start_at);
      const end = splitDateTime(promotion.end_at);

      setProductId(String(promotion.product_id || ""));
      setProductSearch(productLabelFromPromotion(promotion));
      setKind(promotion.kind || "PERCENT_OFF");
      setPercentOff(promotion.percent_off == null ? "" : String(promotion.percent_off));
      setAmountOff(promotion.amount_off == null ? "" : String(promotion.amount_off));
      setFixedPrice(promotion.fixed_price == null ? "" : String(promotion.fixed_price));
      setBundleBuyQty(
        promotion.bundle_buy_qty == null ? "" : String(promotion.bundle_buy_qty),
      );
      setBundlePayPrice(
        promotion.bundle_pay_price == null ? "" : String(promotion.bundle_pay_price),
      );
      setMaxDiscountedQty(
        promotion.max_discounted_qty == null ? "" : String(promotion.max_discounted_qty),
      );
      setDescription(promotion.description || "");
      setStartDate(start.date || todayDateLocal());
      setStartTime("00:00");
      setEndDate(end.date || "");
      setEndTime("23:59:59");
    } else {
      setProductId("");
      setProductSearch("");
      setKind("PERCENT_OFF");
      setPercentOff("");
      setAmountOff("");
      setFixedPrice("");
      setBundleBuyQty("");
      setBundlePayPrice("");
      setMaxDiscountedQty("");
      setDescription("");
      setStartDate(todayDateLocal());
      setStartTime("00:00");
      setEndDate("");
      setEndTime("23:59:59");
    }
  }, [open, isEdit, promotion]);

  if (!open) return null;

  const showProductDropdown = productSearchFocused && canSearch && !productId;

  function selectProduct(product) {
    setProductId(String(product.id));
    setProductSearch(productLabel(product));
    setProductSearchFocused(false);
    setFieldErrors((prev) => ({ ...prev, product_id: "" }));
  }

  function validate() {
    const errors = {};
    const pid = Number(productId);
    const startAt = combineDateTime(startDate, startTime);
    const endAt = combineDateTime(endDate, endTime);

    if (!Number.isInteger(pid) || pid <= 0) errors.product_id = "צריך לבחור מוצר למבצע";
    if (!kind) errors.kind = "צריך לבחור סוג מבצע";
    if (!startDate) errors.start_at = "תאריך התחלה חובה";
        if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      errors.end_at = "תאריך הסיום חייב להיות אחרי תאריך ההתחלה";
    }

    if (kind === "PERCENT_OFF") {
      const n = numberValue(percentOff);
      if (n === null || n <= 0 || n > 100) errors.percent_off = "אחוז הנחה חייב להיות בין 0 ל-100";
    }

    if (kind === "AMOUNT_OFF") {
      const n = numberValue(amountOff);
      if (n === null || n <= 0) errors.amount_off = "הנחה בשקלים חייבת להיות גדולה מ-0";
    }

    if (kind === "FIXED_PRICE") {
      const n = numberValue(fixedPrice);
      if (n === null || n < 0) errors.fixed_price = "מחיר קבוע לא תקין";
    }

    if (kind === "BUNDLE") {
      const qty = Number(bundleBuyQty);
      const price = numberValue(bundlePayPrice);
      if (!Number.isInteger(qty) || qty < 2) errors.bundle_buy_qty = "כמות במבצע חייבת להיות מספר שלם מ-2 ומעלה";
      if (price === null || price < 0) errors.bundle_pay_price = "מחיר החבילה לא תקין";
    }

    if (String(maxDiscountedQty || "").trim()) {
      const maxQty = numberValue(maxDiscountedQty);
      if (maxQty === null || maxQty <= 0) {
        errors.max_discounted_qty = "מקסימום במבצע חייב להיות גדול מ-0";
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
      product_id: Number(productId),
      kind,
      description: description.trim() || null,
      start_at: combineDateTime(startDate, startTime),
      end_at: endDate ? combineDateTime(endDate, endTime) : null,
    };

    if (kind === "PERCENT_OFF") payload.percent_off = Number(percentOff);
    if (kind === "AMOUNT_OFF") payload.amount_off = Number(amountOff);
    if (kind === "FIXED_PRICE") payload.fixed_price = Number(fixedPrice);
    if (kind === "BUNDLE") {
      payload.bundle_buy_qty = Number(bundleBuyQty);
      payload.bundle_pay_price = Number(bundlePayPrice);
    }
    if (String(maxDiscountedQty || "").trim()) {
      payload.max_discounted_qty = Number(maxDiscountedQty);
    } else {
      payload.max_discounted_qty = null;
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              {isEdit ? <Pencil className="h-6 w-6" /> : <BadgePercent className="h-6 w-6" />}
            </div>

            <div className="min-w-0 flex-1 text-right">
              <div className="text-xl font-extrabold leading-tight">
                {isEdit ? "עריכת מבצע" : "הוספת מבצע"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                בחר מוצר, סוג מבצע ותאריכי תוקף. הפעילות תחושב אוטומטית לפי התאריכים.
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-200 p-4">
            <div className="grid gap-4 sm:grid-cols-12">
              <InputShell
                label="מוצר"
                error={fieldErrors.product_id}
                className="relative z-30 sm:col-span-12"
              >
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-400">
                    <PackageSearch className="h-4 w-4" />
                  </div>
                  <input
                    className="w-full rounded-2xl bg-white ps-10 pe-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={productSearch}
                    onFocus={() => setProductSearchFocused(true)}
                    onBlur={() => setTimeout(() => setProductSearchFocused(false), 120)}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setProductId("");
                      setFieldErrors((prev) => ({ ...prev, product_id: "" }));
                    }}
                    placeholder="חפש מוצר לפי שם / שם באנגלית"
                  />

                  {showProductDropdown ? (
                    <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-2xl border border-slate-100 bg-white shadow-xl">
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
                  ) : null}
                </div>

                {!productId && productSearch.trim().length > 0 && productSearch.trim().length < 2 ? (
                  <div className="mt-1 text-xs text-slate-500">
                    הקלד לפחות 2 אותיות כדי לחפש מוצר.
                  </div>
                ) : null}
              </InputShell>

              <InputShell label="סוג מבצע" error={fieldErrors.kind} className="sm:col-span-4">
                <select
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setFieldErrors({});
                  }}
                >
                  {Object.entries(KIND_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </InputShell>

              {kind === "PERCENT_OFF" ? (
                <InputShell label="אחוז הנחה" error={fieldErrors.percent_off} className="sm:col-span-4">
                  <input
                    className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={percentOff}
                    onChange={(e) => setPercentOff(e.target.value)}
                    inputMode="decimal"
                    placeholder="לדוגמה: 10"
                  />
                </InputShell>
              ) : null}

              {kind === "AMOUNT_OFF" ? (
                <InputShell label="הנחה בשקלים" error={fieldErrors.amount_off} className="sm:col-span-4">
                  <input
                    className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={amountOff}
                    onChange={(e) => setAmountOff(e.target.value)}
                    inputMode="decimal"
                    placeholder="לדוגמה: 2"
                  />
                </InputShell>
              ) : null}

              {kind === "FIXED_PRICE" ? (
                <InputShell label="מחיר קבוע" error={fieldErrors.fixed_price} className="sm:col-span-4">
                  <input
                    className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                    value={fixedPrice}
                    onChange={(e) => setFixedPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder="לדוגמה: 9.90"
                  />
                </InputShell>
              ) : null}

              {kind === "BUNDLE" ? (
                <>
                  <InputShell label="כמות" error={fieldErrors.bundle_buy_qty} className="sm:col-span-4">
                    <input
                      className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                      value={bundleBuyQty}
                      onChange={(e) => setBundleBuyQty(e.target.value)}
                      inputMode="numeric"
                      placeholder="לדוגמה: 2"
                    />
                  </InputShell>
                  <InputShell label="מחיר לכמות" error={fieldErrors.bundle_pay_price} className="sm:col-span-4">
                    <input
                      className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                      value={bundlePayPrice}
                      onChange={(e) => setBundlePayPrice(e.target.value)}
                      inputMode="decimal"
                      placeholder="לדוגמה: 12.90"
                    />
                  </InputShell>
                </>
              ) : null}

              <InputShell label="מקסימום יחידות במבצע" error={fieldErrors.max_discounted_qty} className="sm:col-span-4">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={maxDiscountedQty}
                  onChange={(e) => setMaxDiscountedQty(e.target.value)}
                  inputMode="decimal"
                  placeholder="ריק = -"
                />
                <div className="mt-1 text-xs text-slate-500">
                  לדוגמה: 2 אומר שרק 2 יחידות ראשונות יקבלו את המבצע.
                </div>
              </InputShell>

              <InputShell label="תאריך התחלה" error={fieldErrors.start_at} className="sm:col-span-4">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  type="date"
                />
              </InputShell>

              <InputShell label="תאריך סיום" error={fieldErrors.end_at} className="sm:col-span-4">
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (e.target.value && !endTime) setEndTime("23:59:59");
                  }}
                  type="date"
                />
                <div className="mt-1 text-xs text-slate-500">
                  אפשר להשאיר ריק למבצע ללא תאריך סיום.
                </div>
              </InputShell>

              <InputShell label="תיאור" error="" className="sm:col-span-12">
                <textarea
                  className="mt-2 min-h-24 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="לדוגמה: חלב תנובה 3% 1 ליטר"
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
