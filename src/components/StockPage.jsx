import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useCreateStockProduct,
  useDeleteStockProduct,
  useStockCategories,
  useStockProductsInfinite,
  useUpdateStockProduct,
} from "../lib/hooks";
import { StockProductModal } from "./StockProductModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { PackageSearch, Plus, Search } from "lucide-react";

const LS_KEY = "picker_stock_filters_v1";

function loadFilters() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const j = raw ? JSON.parse(raw) : null;
    return {
      category: typeof j?.category === "string" ? j.category : "",
      subCategory: typeof j?.subCategory === "string" ? j.subCategory : "",
      q: typeof j?.q === "string" ? j.q : "",
    };
  } catch {
    return { category: "", subCategory: "", q: "" };
  }
}

function saveFilters(next) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {}
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

function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

function fmtPrice(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return `₪${Number(v).toFixed(2)}`;
}

function stockUnitLabel(u) {
  if (!u) return "";
  if (u === "kg" || u === 'ק"ג' || u === "ק״ג") return "ק״ג";
  if (u === "unit" || u === "units" || u === "יח'" || u === "יח׳") return "יח׳";
  return String(u);
}

function fmtStockAmount(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const x = Number(v);
  return x.toFixed(3).replace(/\.?0+$/, "");
}

export function StockPage({
  onNotify,
  onOrdersChanged,
  onRegisterRefetch,
  onFetchingChange,
}) {
  const initial = useMemo(() => loadFilters(), []);
  const [category, setCategory] = useState(initial.category);
  const [subCategory, setSubCategory] = useState(initial.subCategory);
  const [q, setQ] = useState(initial.q);

  useEffect(() => {
    saveFilters({ category, subCategory, q });
  }, [category, subCategory, q]);

  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    product: null,
  });
  const [confirmDel, setConfirmDel] = useState({ open: false, product: null });

  const qDebounced = useDebouncedValue(q, 350);

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

  // rules:
  // - no category => require at least 2 chars
  // - category exists => allow any q length
  const canFetch =
    Boolean(category) || String(qDebounced || "").trim().length >= 2;

  const productsQuery = useStockProductsInfinite({
    q: String(qDebounced || "").trim(),
    category: category || null,
    sub_category: subCategory || null,
    enabled: canFetch,
  });

  const createMut = useCreateStockProduct();
  const updateMut = useUpdateStockProduct();
  const deleteMut = useDeleteStockProduct();

  const busy =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;

  const products = useMemo(() => {
    const pages = productsQuery.data?.pages || [];
    const all = [];
    for (const p of pages) for (const row of p.products || []) all.push(row);
    return all;
  }, [productsQuery.data]);

  const totalCount = useMemo(() => {
    const first = productsQuery.data?.pages?.[0];
    const v =
      first?.total_count ??
      first?.totalCount ??
      first?.total ??
      first?.count_total ??
      undefined;

    if (v === undefined || v === null || v === "") return null;

    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [productsQuery.data]);

  useEffect(() => {
    if (!category) {
      setSubCategory("");
      return;
    }
    if (subCategory && !(categoriesMap[category] || []).includes(subCategory)) {
      setSubCategory("");
    }
  }, [category, subCategory, categoriesMap]);

  const refetchFn = useCallback(() => productsQuery.refetch(), [productsQuery]);
  useEffect(() => {
    onRegisterRefetch?.(refetchFn);
    return () => onRegisterRefetch?.(null);
  }, [onRegisterRefetch, refetchFn]);

  useEffect(() => {
    onFetchingChange?.(Boolean(productsQuery.isFetching));
  }, [onFetchingChange, productsQuery.isFetching]);

  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!canFetch) return;
    if (!productsQuery.hasNextPage) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries?.[0];
        if (!first?.isIntersecting) return;
        if (productsQuery.isFetchingNextPage) return;
        if (!productsQuery.hasNextPage) return;
        productsQuery.fetchNextPage();
      },
      { root: null, rootMargin: "220px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [
    canFetch,
    productsQuery.hasNextPage,
    productsQuery.isFetchingNextPage,
    productsQuery.fetchNextPage,
  ]);

  const helperText = useMemo(() => {
    if (category) return "";
    const len = String(q || "").trim().length;
    if (len < 2)
      return "כדי להציג מוצרים בלי לבחור קטגוריה, צריך להקליד לפחות 2 אותיות בחיפוש.";
    return "";
  }, [q, category]);

  async function onSaveProduct(payload) {
    try {
      if (modal.mode === "create") {
        await createMut.mutateAsync(payload);
        onNotify?.("success", "מוצר נוסף בהצלחה");
      } else {
        const id = modal.product?.id;
        if (!id) return;
        await updateMut.mutateAsync({ id, payload });
        onNotify?.("success", "מוצר עודכן בהצלחה");
      }
      setModal({ open: false, mode: "create", product: null });
      onOrdersChanged?.();
    } catch (e) {
      onNotify?.("error", e?.message || "שגיאה בשמירה");
    }
  }

  async function onConfirmDelete() {
    const p = confirmDel.product;
    if (!p) return;
    try {
      await deleteMut.mutateAsync(p.id);
      setConfirmDel({ open: false, product: null });
      onNotify?.("success", "המוצר נמחק");
      onOrdersChanged?.();
    } catch (e) {
      onNotify?.("error", e?.message || "שגיאה במחיקה");
    }
  }

  const shownTotal = totalCount ?? products.length;

  return (
    <div className="mt-6 card p-0 overflow-hidden">
      <div className="p-6 sm:p-7" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <PackageSearch className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1 text-right">
              <div className="text-xl font-extrabold leading-tight">
                ניהול מלאי
              </div>
              <div className="mt-1 text-sm text-slate-600">
                חיפוש וסינון מוצרים ועדכון ידני של שם / מחיר / מלאי / קטגוריות.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              className="btn-success"
              onClick={() =>
                setModal({ open: true, mode: "create", product: null })
              }
              disabled={busy}
            >
              <Plus className="h-4 w-4" />
              הוסף מוצר
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 rounded-2xl bg-slate-200 p-4">
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <div className="text-xs font-bold text-slate-700">קטגוריה</div>
              <select
                className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">— ללא —</option>
                {categoryList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <div className="text-xs font-bold text-slate-700">תת-קטגוריה</div>
              <select
                className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                value={subCategory}
                disabled={!category}
                onChange={(e) => setSubCategory(e.target.value)}
              >
                <option value="">— ללא —</option>
                {subCategoryList.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <div className="text-xs font-bold text-slate-700">חיפוש</div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  className="w-full rounded-2xl bg-white ps-10 pe-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    category
                      ? "שם / שם באנגלית"
                      : "שם / שם באנגלית (לפחות 2 אותיות בלי קטגוריה)"
                  }
                />
              </div>
            </div>
          </div>

          {helperText ? (
            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
              {helperText}
            </div>
          ) : null}

          {catQuery.isLoading ? (
            <div className="mt-3 text-sm text-slate-600">טוען קטגוריות…</div>
          ) : catQuery.error ? (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">
              שגיאה בטעינת קטגוריות: {String(catQuery.error?.message || "")}
            </div>
          ) : null}
        </div>

        {/* Results meta row */}
        {canFetch ? (
          <div className="mt-4 flex items-center justify-end gap-2" dir="rtl">
            <span className="pill bg-emerald-50 text-emerald-700">
              תוצאות: {shownTotal}
            </span>
          </div>
        ) : null}

        {/* Table */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="bg-slate-50 text-xs font-extrabold text-slate-700">
                <tr>
                  <th className="px-4 py-3">שם</th>
                  <th className="px-4 py-3">שם באנגלית</th>
                  <th className="px-3 py-3">מחיר</th>
                  <th className="px-3 py-3">מלאי</th>
                  <th className="px-4 py-3">קטגוריה</th>
                  <th className="px-3 py-3">תת-קטגוריה</th>
                  <th className="px-16 py-3">פעולות</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!canFetch ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={7}
                    >
                      בחר קטגוריה או הקלד לפחות 2 אותיות כדי להציג מוצרים
                    </td>
                  </tr>
                ) : productsQuery.isLoading ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={7}
                    >
                      טוען מוצרים…
                    </td>
                  </tr>
                ) : productsQuery.error ? (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-rose-700"
                      colSpan={7}
                    >
                      שגיאה בטעינת מוצרים:{" "}
                      {String(productsQuery.error?.message || "")}
                    </td>
                  </tr>
                ) : products.length ? (
                  products.map((p) => {
                    const unit = stockUnitLabel(p.stock_unit);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900">
                          {p.name || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-700" dir="ltr">
                          {p.display_name_en || "—"}
                        </td>

                        <td className="px-3 py-3 text-slate-900">
                          {fmtPrice(p.price)}
                        </td>

                        <td className="px-3 py-3 text-slate-900">
                          <div className="flex items-center justify-end gap-2">
                            <span>{fmtStockAmount(p.stock_amount)}</span>
                            {unit ? (
                              <span className="pill bg-emerald-50 text-emerald-700">
                                {unit}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          {p.category || "—"}
                        </td>
                        <td className="px-3 py-3 text-slate-700">
                          {p.sub_category || "—"}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button
                              className="btn-secondary"
                              disabled={busy}
                              onClick={() =>
                                setModal({
                                  open: true,
                                  mode: "edit",
                                  product: p,
                                })
                              }
                            >
                              עריכה
                            </button>
                            <button
                              className="btn-outline"
                              disabled={busy}
                              onClick={() =>
                                setConfirmDel({ open: true, product: p })
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
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={7}
                    >
                      אין תוצאות.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* sentinel for infinite scroll */}
          {canFetch && productsQuery.hasNextPage ? (
            <div className="border-t border-slate-100 bg-white p-4">
              <div ref={sentinelRef} />
              {productsQuery.isFetchingNextPage ? (
                <div className="text-center text-sm text-slate-500">
                  טוען עוד…
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <StockProductModal
        open={modal.open}
        mode={modal.mode}
        busy={busy}
        categoriesMap={categoriesMap}
        product={modal.product}
        onCancel={() =>
          setModal({ open: false, mode: "create", product: null })
        }
        onSave={onSaveProduct}
      />

      <ConfirmDeleteModal
        open={confirmDel.open}
        busy={busy}
        title="מחיקת מוצר"
        text={
          confirmDel.product
            ? `למחוק את "${confirmDel.product.name}"?`
            : "למחוק מוצר?"
        }
        hint="שים לב: המוצר ימחק מכל ההזמנות שעדיין לא נאספו ותישלח הודעה בהתאם לבעלי ההזמנות."
        onCancel={() => setConfirmDel({ open: false, product: null })}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
