import { useEffect, useMemo, useState } from "react";
import { Clock, Plus, RefreshCw, Save, Settings2, Trash2 } from "lucide-react";
import { useBusinessSettings, useUpdateBusinessSettings } from "../lib/hooks";

const DAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
  { value: 6, label: "שבת" },
];

const EMPTY_INFO = {
  name: "",
  address: "",
  google_maps_url: "",
  phone: "",
  whatsapp_phone: "",
  email: "",
  supports_delivery: false,
  supports_pickup: true,
  kashrut: "",
  about: "",
  min_order_amount: 0,
  delivery_fee: 0,
  cart_empty_reminder_minutes: 0,
  stock_release_after_inactive_minutes: 0,
};

function emptyRegularHours() {
  return DAYS.map((d) => ({
    day_of_week: d.value,
    is_closed: d.value === 6,
    open_time: d.value === 6 ? "" : "08:00",
    close_time: d.value === 6 ? "" : "20:00",
    note: "",
  }));
}

function normalizeRegular(rows) {
  const byDay = new Map((rows || []).map((r) => [Number(r.day_of_week), r]));
  return DAYS.map((d) => {
    const r = byDay.get(d.value);
    return {
      day_of_week: d.value,
      is_closed: Boolean(r?.is_closed),
      open_time: r?.open_time || "",
      close_time: r?.close_time || "",
      note: r?.note || "",
    };
  });
}

function newSpecialRow() {
  return {
    special_date: "",
    label: "",
    is_closed: false,
    open_time: "08:00",
    close_time: "14:00",
    note: "",
  };
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400";

function Field({ label, help, children, className = "" }) {
  return (
    <label className={`grid gap-1.5 text-right ${className}`}>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {help ? <span className="text-xs font-medium leading-5 text-slate-500">{help}</span> : null}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className={inputClass} />;
}

function TextArea(props) {
  return <textarea {...props} className={`${inputClass} min-h-24 resize-y leading-6`} />;
}

function NumberField({ label, value, onChange, unit, help }) {
  return (
    <Field label={label} help={help}>
      <div className="relative max-w-[210px]">
        <input
          type="number"
          min="0"
          step="1"
          value={value ?? 0}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pe-12 text-left tabular-nums`}
          dir="ltr"
        />
        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-semibold text-slate-500">
          {unit}
        </span>
      </div>
    </Field>
  );
}

function ToggleCard({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 accent-slate-900"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Section({ icon, title, subtitle, action, children }) {
  const Icon = icon;
  return (
    <section className="card overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 text-right">
          {Icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div>
            <div className="text-xl font-extrabold leading-tight text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</div> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-slate-50/70 p-4 ${className}`}>
      <div className="mb-4 text-right">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs font-medium text-slate-500">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function BusinessSettingsPage({ onNotify, onRegisterRefetch, onFetchingChange }) {
  const settings = useBusinessSettings();
  const saveSettings = useUpdateBusinessSettings();
  const [info, setInfo] = useState(EMPTY_INFO);
  const [regularHours, setRegularHours] = useState(emptyRegularHours);
  const [specialHours, setSpecialHours] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    onRegisterRefetch?.(settings.refetch);
  }, [onRegisterRefetch, settings.refetch]);

  useEffect(() => {
    onFetchingChange?.(settings.isFetching || saveSettings.isPending);
  }, [onFetchingChange, settings.isFetching, saveSettings.isPending]);

  useEffect(() => {
    if (!settings.data) return;
    setInfo({ ...EMPTY_INFO, ...settings.data.info });
    setRegularHours(normalizeRegular(settings.data.regular_hours));
    setSpecialHours(
      (settings.data.special_hours || []).map((r) => ({
        special_date: r.special_date || "",
        label: r.label || "",
        is_closed: Boolean(r.is_closed),
        open_time: r.open_time || "",
        close_time: r.close_time || "",
        note: r.note || "",
      })),
    );
    setDirty(false);
  }, [settings.data]);

  const canSave = useMemo(() => {
    return Boolean(info.name?.trim() && info.address?.trim() && !saveSettings.isPending);
  }, [info.name, info.address, saveSettings.isPending]);

  function changeInfo(key, value) {
    setInfo((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function changeRegular(day, key, value) {
    setRegularHours((prev) =>
      prev.map((r) => (r.day_of_week === day ? { ...r, [key]: value } : r)),
    );
    setDirty(true);
  }

  function changeSpecial(index, key, value) {
    setSpecialHours((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
    setDirty(true);
  }

  async function save() {
    try {
      await saveSettings.mutateAsync({
        info,
        regular_hours: regularHours,
        special_hours: specialHours,
      });
      setDirty(false);
      onNotify?.("success", "פרטי העסק נשמרו בהצלחה");
    } catch (err) {
      onNotify?.("error", err?.message || "שגיאה בשמירת פרטי העסק");
    }
  }

  if (settings.isLoading) {
    return (
      <div className="mt-6 card p-8 text-center text-sm font-semibold text-slate-600">
        טוען פרטי עסק…
      </div>
    );
  }

  if (settings.error) {
    return (
      <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-right text-sm text-rose-900">
        <div className="font-extrabold">שגיאה בטעינת פרטי העסק</div>
        <div className="mt-1">{settings.error.message}</div>
        <button className="btn-outline mt-3" onClick={() => settings.refetch()}>
          נסה שוב
        </button>
      </div>
    );
  }

  const saveButton = (
    <button className="btn-primary" onClick={save} disabled={!canSave}>
      {saveSettings.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      שמור שינויים
    </button>
  );

  return (
    <div className="mt-6 grid gap-4 text-slate-900" dir="rtl">
      <Section
        icon={Settings2}
        title="פרטי עסק וסניף"
        subtitle="המידע שהבוט והדשבורד משתמשים בו לכתובת, טלפון, כשרות, משלוחים ושעות פתיחה."
        action={saveButton}
      >
        {dirty ? (
          <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
            יש שינויים שלא נשמרו
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.8fr)]">
          <Panel title="פרטי הסניף">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="שם הסניף">
                <TextInput value={info.name || ""} onChange={(e) => changeInfo("name", e.target.value)} />
              </Field>
              <Field label="כתובת">
                <TextInput value={info.address || ""} onChange={(e) => changeInfo("address", e.target.value)} />
              </Field>
              <Field label="קישור לגוגל מפות">
                <TextInput value={info.google_maps_url || ""} onChange={(e) => changeInfo("google_maps_url", e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" />
              </Field>
              <Field label="טלפון">
                <TextInput value={info.phone || ""} onChange={(e) => changeInfo("phone", e.target.value)} dir="ltr" />
              </Field>
              <Field label="טלפון WhatsApp">
                <TextInput value={info.whatsapp_phone || ""} onChange={(e) => changeInfo("whatsapp_phone", e.target.value)} dir="ltr" />
              </Field>
              <Field label="מייל">
                <TextInput value={info.email || ""} onChange={(e) => changeInfo("email", e.target.value)} dir="ltr" />
              </Field>
              <Field label="סוג כשרות" className="sm:col-span-2">
                <TextInput value={info.kashrut || ""} onChange={(e) => changeInfo("kashrut", e.target.value)} placeholder="לדוגמה: רבנות / בד״ץ / ללא תעודה" />
              </Field>
            </div>
          </Panel>

          <Panel title="הגדרות הזמנה ואוטומציה" subtitle="0 משאיר את ההגדרה כבויה.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <NumberField
                label="סכום מינימלי להזמנה"
                unit="₪"
                value={info.min_order_amount ?? 0}
                onChange={(value) => changeInfo("min_order_amount", value)}
              />
              <NumberField
                label="דמי משלוח"
                unit="₪"
                value={info.delivery_fee ?? 0}
                onChange={(value) => changeInfo("delivery_fee", value)}
              />
              <NumberField
                label="תזכורת לעגלה ריקה"
                unit="דקות"
                value={info.cart_empty_reminder_minutes ?? 0}
                onChange={(value) => changeInfo("cart_empty_reminder_minutes", value)}
                help="אחרי כמה זמן ללא הוספת מוצרים תישלח תזכורת. 0 = כבוי."
              />
              <NumberField
                label="החזרת מוצרים למלאי"
                unit="דקות"
                value={info.stock_release_after_inactive_minutes ?? 0}
                onChange={(value) => changeInfo("stock_release_after_inactive_minutes", value)}
                help="אחרי כמה זמן שהעגלה לא השתנתה המוצרים יחזרו למלאי. 0 = כבוי."
              />
            </div>
          </Panel>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[320px_1fr]">
          <Panel title="אפשרויות שירות">
            <div className="grid gap-2">
              <ToggleCard
                label="תומך במשלוחים"
                checked={info.supports_delivery}
                onChange={(value) => changeInfo("supports_delivery", value)}
              />
              <ToggleCard
                label="תומך באיסוף עצמי"
                checked={info.supports_pickup}
                onChange={(value) => changeInfo("supports_pickup", value)}
              />
            </div>
          </Panel>
          <Panel title="תיאור קצר על הסניף">
            <Field label="מה יוצג לבוט בתשובות כלליות">
              <TextArea rows={3} value={info.about || ""} onChange={(e) => changeInfo("about", e.target.value)} placeholder="כמה מילים על הסניף, השירותים, אזורי שירות וכו׳" />
            </Field>
          </Panel>
        </div>
      </Section>

      <Section icon={Clock} title="שעות פתיחה רגילות" action={saveButton}>
        <div className="grid gap-2">
          {regularHours.map((row) => {
            const day = DAYS.find((d) => d.value === row.day_of_week);
            return (
              <div key={row.day_of_week} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[90px_95px_120px_120px_1fr] sm:items-center">
                <div className="text-sm font-semibold text-slate-900">{day?.label}</div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" className="h-5 w-5 accent-slate-900" checked={Boolean(row.is_closed)} onChange={(e) => changeRegular(row.day_of_week, "is_closed", e.target.checked)} />
                  סגור
                </label>
                <TextInput type="time" value={row.open_time || ""} disabled={row.is_closed} onChange={(e) => changeRegular(row.day_of_week, "open_time", e.target.value)} />
                <TextInput type="time" value={row.close_time || ""} disabled={row.is_closed} onChange={(e) => changeRegular(row.day_of_week, "close_time", e.target.value)} />
                <TextInput value={row.note || ""} onChange={(e) => changeRegular(row.day_of_week, "note", e.target.value)} placeholder="הערה" />
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        icon={Clock}
        title="שעות פתיחה מיוחדות"
        subtitle="חגים, ערבי חג, ימי סגירה חריגים או שעות שונות מהרגיל."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="btn-outline"
              onClick={() => {
                setSpecialHours((prev) => [...prev, newSpecialRow()]);
                setDirty(true);
              }}
            >
              <Plus className="h-4 w-4" />
              הוסף יום מיוחד
            </button>
            {saveButton}
          </div>
        }
      >
        <div className="grid gap-2">
          {specialHours.length ? (
            specialHours.map((row, index) => (
              <div key={`${row.special_date || "new"}-${index}`} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[145px_1fr_90px_120px_120px_1fr_auto] sm:items-center">
                <TextInput type="date" value={row.special_date || ""} onChange={(e) => changeSpecial(index, "special_date", e.target.value)} />
                <TextInput value={row.label || ""} onChange={(e) => changeSpecial(index, "label", e.target.value)} placeholder="שם היום / חג" />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" className="h-5 w-5 accent-slate-900" checked={Boolean(row.is_closed)} onChange={(e) => changeSpecial(index, "is_closed", e.target.checked)} />
                  סגור
                </label>
                <TextInput type="time" value={row.open_time || ""} disabled={row.is_closed} onChange={(e) => changeSpecial(index, "open_time", e.target.value)} />
                <TextInput type="time" value={row.close_time || ""} disabled={row.is_closed} onChange={(e) => changeSpecial(index, "close_time", e.target.value)} />
                <TextInput value={row.note || ""} onChange={(e) => changeSpecial(index, "note", e.target.value)} placeholder="הערה" />
                <button
                  className="btn-outline text-rose-700 hover:bg-rose-50"
                  onClick={() => {
                    setSpecialHours((prev) => prev.filter((_, i) => i !== index));
                    setDirty(true);
                  }}
                  title="מחק"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
              עדיין אין שעות מיוחדות
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
