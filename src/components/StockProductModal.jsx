/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, PackagePlus, Pencil } from "lucide-react";

function cleanEmojiDisplay(value) {
  const s = String(value ?? "").trim();
  if (!s || /^[?\uFFFD\s]+$/u.test(s)) return "";
  return Array.from(s).slice(0, 8).join("");
}

function subName(row) {
  return typeof row === "string" ? row : String(row?.name || "");
}

function subEmoji(row) {
  return typeof row === "string" ? "" : cleanEmojiDisplay(row?.emoji);
}

function findSubMeta(categoriesMap, category, subCategory) {
  return (categoriesMap?.[category] || []).find((x) => subName(x) === subCategory) || null;
}

export function StockProductModal({
  open,
  mode,
  busy,
  categoriesMap,
  product,
  onCancel,
  onSave,
}) {
  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [displayNameEn, setDisplayNameEn] = useState("");
  const [price, setPrice] = useState("");
  const [stockAmount, setStockAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [emoji, setEmoji] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [err, setErr] = useState("");

  const categoryList = useMemo(
    () =>
      Object.keys(categoriesMap || {}).sort((a, b) => a.localeCompare(b, "he")),
    [categoriesMap],
  );

  const subList = useMemo(() => {
    if (!category) return [];
    return (categoriesMap?.[category] || [])
      .slice()
      .sort((a, b) => subName(a).localeCompare(subName(b), "he"));
  }, [categoriesMap, category]);

  useEffect(() => {
    if (!open) return;

    setErr("");

    if (isEdit && product) {
      setName(product.name || "");
      setDisplayNameEn(product.display_name_en || "");
      setPrice(
        product.price === null || product.price === undefined
          ? ""
          : String(product.price),
      );
      setStockAmount(
        product.stock_amount === null || product.stock_amount === undefined
          ? ""
          : String(product.stock_amount),
      );

      setCategory(product.category || "");
      setSubCategory(product.sub_category || "");
      setEmoji(cleanEmojiDisplay(product.emoji));
      setIsDefault(Boolean(product.is_default));
    } else {
      setName("");
      setDisplayNameEn("");
      setPrice("");
      setStockAmount("");
      setCategory("");
      setSubCategory("");
      setEmoji("");
      setIsDefault(false);
    }
  }, [open, isEdit, product]);

  useEffect(() => {
    if (!category) {
      setSubCategory("");
      return;
    }
    if (
      subCategory &&
      !(categoriesMap?.[category] || []).some((x) => subName(x) === subCategory)
    ) {
      setSubCategory("");
    }
  }, [category, subCategory, categoriesMap]);

  const defaultEmoji = useMemo(() => {
    if (!category || !subCategory) return "";
    return subEmoji(findSubMeta(categoriesMap, category, subCategory));
  }, [categoriesMap, category, subCategory]);

  if (!open) return null;

  function validate() {
    const n = name.trim();
    const en = displayNameEn.trim();
    const p = String(price).trim();
    const s = String(stockAmount).trim();

    if (!n) return "שם מוצר חובה";
    if (!en) return "שם באנגלית חובה";
    if (!category) return "קטגוריה חובה";
    if (!subCategory) return "תת-קטגוריה חובה";
    if (!p || Number.isNaN(Number(p))) return "מחיר לא תקין";
    if (Number(p) < 0) return "מחיר לא יכול להיות שלילי";
    if (!s || Number.isNaN(Number(s))) return "מלאי לא תקין";
    if (Number(s) < 0) return "מלאי לא יכול להיות שלילי";
    return "";
  }

  function submit() {
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    onSave?.({
      name: name.trim(),
      display_name_en: displayNameEn.trim(),
      price: Number(price),
      stock_amount: Number(stockAmount),
      category,
      sub_category: subCategory,
      emoji: cleanEmojiDisplay(emoji),
      is_default: isDefault,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="p-6" dir="rtl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              {isEdit ? (
                <Pencil className="h-6 w-6" />
              ) : (
                <PackagePlus className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0 flex-1 text-right">
              <div className="text-xl font-extrabold leading-tight">
                {isEdit ? "עריכת מוצר" : "הוספת מוצר"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                עדכן את פרטי המוצר שיופיעו במלאי.
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-200 p-4">
            {err ? (
              <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">
                {err}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <div className="text-xs font-bold text-slate-700">שם</div>
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="לדוגמה: חלב 3%"
                />
              </div>

              <div className="sm:col-span-6">
                <div className="text-xs font-bold text-slate-700">
                  שם באנגלית
                </div>
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={displayNameEn}
                  onChange={(e) => setDisplayNameEn(e.target.value)}
                  placeholder="לדוגמה: Milk 3%"
                  dir="ltr"
                />
              </div>

              <div className="sm:col-span-4">
                <div className="text-xs font-bold text-slate-700">מחיר</div>
                <input
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="לדוגמה: 9.90"
                />
              </div>

              <div className="sm:col-span-4">
                <div className="text-xs font-bold text-slate-700">אימוג׳י</div>
                <input
                  className="mt-2 w-full max-w-[120px] rounded-2xl bg-white px-3 py-2 text-center text-lg text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={emoji}
                  onChange={(e) => {
                    setEmoji(e.target.value);
                  }}
                  placeholder={defaultEmoji || "🛒"}
                  maxLength={16}
                />
                <div className="mt-1 text-[11px] font-semibold text-slate-500">
                  {defaultEmoji
                    ? `ריק = ברירת המחדל של תת-הקטגוריה (${defaultEmoji})`
                    : "ריק = ברירת המחדל של תת-הקטגוריה"}
                </div>
              </div>

              <div className="sm:col-span-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">מלאי</div>
                </div>
                <input
                  className="mt-2 w-full max-w-[240px] rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="לדוגמה: 12"
                />
              </div>

              <div className="sm:col-span-12 -mt-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500">
                  <input
                    className="h-4 w-4 shrink-0 accent-emerald-600"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                  />
                  <span className="font-bold text-slate-700">
                    מוצר דיפולטיבי
                  </span>
                  <span>
                    יתועדף מול מוצרים עם שם דומה.
                  </span>
                </label>
              </div>

              <div className="sm:col-span-6">
                <div className="text-xs font-bold text-slate-700">קטגוריה</div>
                <select
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">— בחר —</option>
                  {categoryList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6">
                <div className="text-xs font-bold text-slate-700">
                  תת-קטגוריה
                </div>
                <select
                  className="mt-2 w-full rounded-2xl bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                  value={subCategory}
                  disabled={!category}
                  onChange={(e) => setSubCategory(e.target.value)}
                >
                  <option value="">— בחר —</option>
                  {subList.map((sc) => {
                    const name = subName(sc);
                    const icon = subEmoji(sc);
                    return (
                      <option key={name} value={name}>
                        {icon ? `${icon} ` : ""}{name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-outline" onClick={onCancel} disabled={busy}>
              ביטול
            </button>

            <button className="btn-success" onClick={submit} disabled={busy}>
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "שמור שינויים" : "הוסף מוצר"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
