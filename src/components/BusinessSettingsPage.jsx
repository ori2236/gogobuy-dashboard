import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
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

function Field({ label, children }) {
  return (
    <label className="grid gap-1 text-right">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-900"
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-900"
    />
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

  return (
    <div className="mt-6 grid gap-5" dir="rtl">
      <div className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-extrabold text-slate-900">פרטי עסק וסניף</div>
            <div className="mt-1 text-sm text-slate-600">
              המידע הזה משמש גם לתשובות של הבוט ללקוחות על כתובת, טלפון, כשרות ושעות פתיחה.
            </div>
          </div>

          <button className="btn-primary sm:me-auto" onClick={save} disabled={!canSave}>
            {saveSettings.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            שמור שינויים
          </button>
        </div>

        {dirty ? (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            יש שינויים שלא נשמרו
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
          <Field label="סוג כשרות">
            <TextInput value={info.kashrut || ""} onChange={(e) => changeInfo("kashrut", e.target.value)} placeholder="לדוגמה: רבנות / בד״ץ / ללא תעודה" />
          </Field>
          <div className="grid content-end gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
              <span>תומך במשלוחים</span>
              <input type="checkbox" className="h-5 w-5 accent-slate-900" checked={Boolean(info.supports_delivery)} onChange={(e) => changeInfo("supports_delivery", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700">
              <span>תומך באיסוף עצמי</span>
              <input type="checkbox" className="h-5 w-5 accent-slate-900" checked={Boolean(info.supports_pickup)} onChange={(e) => changeInfo("supports_pickup", e.target.checked)} />
            </label>
          </div>
          <Field label="תיאור קצר על הסניף">
            <TextArea rows={4} value={info.about || ""} onChange={(e) => changeInfo("about", e.target.value)} placeholder="כמה מילים על הסניף, השירותים, אזורי שירות וכו׳" />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-lg font-extrabold text-slate-900">שעות פתיחה רגילות</div>
        <div className="mt-4 grid gap-3">
          {regularHours.map((row) => {
            const day = DAYS.find((d) => d.value === row.day_of_week);
            return (
              <div key={row.day_of_week} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[95px_110px_1fr_1fr_1.5fr] sm:items-center">
                <div className="text-sm font-extrabold text-slate-900">{day?.label}</div>
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
      </div>

      <div className="card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-extrabold text-slate-900">שעות פתיחה מיוחדות</div>
            <div className="mt-1 text-sm text-slate-600">חגים, ערבי חג, ימי סגירה חריגים או שעות שונות מהרגיל.</div>
          </div>
          <button
            className="btn-outline sm:me-auto"
            onClick={() => {
              setSpecialHours((prev) => [...prev, newSpecialRow()]);
              setDirty(true);
            }}
          >
            <Plus className="h-4 w-4" />
            הוסף יום מיוחד
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {specialHours.length ? (
            specialHours.map((row, index) => (
              <div key={`${row.special_date || "new"}-${index}`} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_105px_1fr_1fr_1.5fr_auto] sm:items-center">
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
      </div>
    </div>
  );
}
