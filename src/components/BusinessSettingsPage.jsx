import { useEffect, useMemo, useState } from "react";
import { Clock, Lock, MapPinned, Plus, RefreshCw, Save, Settings2, Trash2 } from "lucide-react";
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

const DEFAULT_SAME_DAY_CUTOFF_TIME = "15:00";
const DEFAULT_DELIVERY_ARRIVAL_START_TIME = "16:00";
const DEFAULT_DELIVERY_ARRIVAL_END_TIME = "18:00";

const EMPTY_INFO = {
  name: "",
  chain_name: "",
  branch_name: "",
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
  min_delivery_order_amount: 0,
  min_pickup_order_amount: 0,
  delivery_fee: 0,
  cart_empty_reminder_minutes: 5,
  idle_customer_reminder_minutes: 10,
  stock_release_after_inactive_minutes: 30,
  max_order_quantity_per_product: 10,
  order_same_day_cutoff_time: DEFAULT_SAME_DAY_CUTOFF_TIME,
  delivery_arrival_start_time: DEFAULT_DELIVERY_ARRIVAL_START_TIME,
  delivery_arrival_end_time: DEFAULT_DELIVERY_ARRIVAL_END_TIME,
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

function newDeliveryZone(name = "") {
  return {
    settlement_name: name,
    is_active: true,
  };
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

function Field({ label, help, error, children, className = "" }) {
  return (
    <label className={`grid gap-1.5 text-right font-sans ${className}`}>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {help ? <span className="text-xs font-medium leading-5 text-slate-500">{help}</span> : null}
      {error ? <span className="text-xs font-extrabold leading-5 text-rose-600">{error}</span> : null}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className={`${inputClass} ${props.className || ""}`} />;
}

function TextArea(props) {
  return <textarea {...props} className={`${inputClass} min-h-24 resize-y leading-6 ${props.className || ""}`} />;
}

function NumberField({ label, value, onChange, unit, help, min = 0, max, error, disabled }) {
  return (
    <Field label={label} help={help} error={error}>
      <div className="flex max-w-[280px] items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-100">
        <input
          type="number"
          min={min}
          max={max}
          step="1"
          value={value ?? min}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-left text-sm font-semibold tabular-nums text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-400"
          dir="ltr"
        />
        <span className="shrink-0 border-s border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-500">
          {unit}
        </span>
      </div>
    </Field>
  );
}

function ToggleCard({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 accent-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function SaveFooter({ canEdit, dirty, canSave, errors, isSaving, onSave }) {
  if (!canEdit) {
    return (
      <div className="mt-5 flex items-center justify-end gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
        <Lock className="h-4 w-4" />
        משתמש רגיל יכול לראות את הפרטים, אבל רק מנהל יכול לשנות אותם.
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-right text-xs font-bold text-slate-600">
          אל תשכח אחרי שינוי לשמור את השינויים.
          {dirty ? <span className="me-2 text-amber-700">יש שינויים שלא נשמרו.</span> : null}
          {errors?.length ? <div className="mt-1 text-rose-600">{errors[0]}</div> : null}
        </div>
        <button className="btn-primary px-6 py-2.5" onClick={onSave} disabled={!canSave}>
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          שמור שינויים
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, subtitle, footer, children }) {
  const Icon = icon;
  return (
    <section className="card overflow-hidden p-5 sm:p-6 font-sans">
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
      <div className="mt-5">{children}</div>
      {footer}
    </section>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <div className={`h-fit rounded-2xl border border-slate-100 bg-slate-50/70 p-4 ${className}`}>
      <div className="mb-4 text-right">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs font-medium text-slate-500">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function BusinessSettingsPage({ user, onNotify, onRegisterRefetch, onFetchingChange }) {
  const settings = useBusinessSettings();
  const saveSettings = useUpdateBusinessSettings();
  const [info, setInfo] = useState(EMPTY_INFO);
  const [regularHours, setRegularHours] = useState(emptyRegularHours);
  const [specialHours, setSpecialHours] = useState([]);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [newZoneName, setNewZoneName] = useState("");
  const [dirty, setDirty] = useState(false);
  const canEdit = user?.role === "admin";

  useEffect(() => {
    onRegisterRefetch?.(settings.refetch);
  }, [onRegisterRefetch, settings.refetch]);

  useEffect(() => {
    onFetchingChange?.(settings.isFetching || saveSettings.isPending);
  }, [onFetchingChange, settings.isFetching, saveSettings.isPending]);

  useEffect(() => {
    if (!settings.data) return;
    const dataInfo = { ...EMPTY_INFO, ...settings.data.info };
    const legacyMin = Number(dataInfo.min_order_amount || 0);
    setInfo({
      ...dataInfo,
      min_delivery_order_amount:
        dataInfo.min_delivery_order_amount ?? legacyMin,
      min_pickup_order_amount:
        dataInfo.min_pickup_order_amount ?? legacyMin,
      cart_empty_reminder_minutes: Number(dataInfo.cart_empty_reminder_minutes || 0) < 5 ? 5 : dataInfo.cart_empty_reminder_minutes,
      idle_customer_reminder_minutes: Number(dataInfo.idle_customer_reminder_minutes ?? 10),
      stock_release_after_inactive_minutes: Number(dataInfo.stock_release_after_inactive_minutes || 0) < 30 ? 30 : dataInfo.stock_release_after_inactive_minutes,
      order_same_day_cutoff_time: dataInfo.order_same_day_cutoff_time || DEFAULT_SAME_DAY_CUTOFF_TIME,
      delivery_arrival_start_time: dataInfo.delivery_arrival_start_time || DEFAULT_DELIVERY_ARRIVAL_START_TIME,
      delivery_arrival_end_time: dataInfo.delivery_arrival_end_time || DEFAULT_DELIVERY_ARRIVAL_END_TIME,
    });
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
    setDeliveryZones(
      (settings.data.delivery_zones || []).map((z) => ({
        settlement_name: z.settlement_name || "",
        is_active: z.is_active !== false,
      })),
    );
    setDirty(false);
  }, [settings.data]);

  const validation = useMemo(() => {
    const errors = [];
    if (!String(info.name || "").trim()) errors.push("חובה למלא שם סניף");
    if (!String(info.address || "").trim()) errors.push("חובה למלא כתובת");
    const cartReminder = Number(info.cart_empty_reminder_minutes || 0);
    const idleCustomerReminder = Number(info.idle_customer_reminder_minutes || 0);
    const stockRelease = Number(info.stock_release_after_inactive_minutes || 0);
    const maxPerProduct = Number(info.max_order_quantity_per_product || 0);
    if (cartReminder < 5) errors.push("תזכורת לעגלה לא מאושרת חייבת להיות לפחות 5 דקות");
    if (idleCustomerReminder < 0) errors.push("תזכורת לפני התחלת עגלה לא יכולה להיות שלילית");
    if (stockRelease < 30) errors.push("החזרת מוצרים למלאי חייבת להיות לפחות 30 דקות");
    if (cartReminder >= stockRelease) errors.push("תזכורת לעגלה לא מאושרת חייבת להיות נמוכה מזמן החזרת המוצרים למלאי");
    if (maxPerProduct < 10) errors.push("מקסימום הזמנה ממוצר אחד חייב להיות לפחות 10");
    const arrivalStart = String(info.delivery_arrival_start_time || "").trim();
    const arrivalEnd = String(info.delivery_arrival_end_time || "").trim();
    if ((arrivalStart && !arrivalEnd) || (!arrivalStart && arrivalEnd)) {
      errors.push("בשעות הגעה ללקוחות צריך למלא גם שעת התחלה וגם שעת סיום");
    }
    if (arrivalStart && arrivalEnd && arrivalStart >= arrivalEnd) {
      errors.push("שעת סיום ההגעה חייבת להיות אחרי שעת ההתחלה");
    }
    return errors;
  }, [info]);

  const canSave = canEdit && dirty && validation.length === 0 && !saveSettings.isPending;

  function changeInfo(key, value) {
    if (!canEdit) return;
    setInfo((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function changeRegular(day, key, value) {
    if (!canEdit) return;
    setRegularHours((prev) =>
      prev.map((r) => (r.day_of_week === day ? { ...r, [key]: value } : r)),
    );
    setDirty(true);
  }

  function changeSpecial(index, key, value) {
    if (!canEdit) return;
    setSpecialHours((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
    setDirty(true);
  }

  function changeZone(index, key, value) {
    if (!canEdit) return;
    setDeliveryZones((prev) => prev.map((z, i) => (i === index ? { ...z, [key]: value } : z)));
    setDirty(true);
  }

  function addZone(name = newZoneName) {
    if (!canEdit) return;
    const clean = String(name || "").trim().replace(/\s+/g, " ");
    if (!clean) return;
    const exists = deliveryZones.some((z) => String(z.settlement_name || "").trim() === clean);
    if (exists) {
      setNewZoneName("");
      return;
    }
    setDeliveryZones((prev) => [...prev, newDeliveryZone(clean)]);
    setNewZoneName("");
    setDirty(true);
  }

  async function save() {
    if (!canSave) return;
    try {
      const stockRelease = Math.max(30, Number(info.stock_release_after_inactive_minutes || 30));
      const cartReminder = Math.max(5, Number(info.cart_empty_reminder_minutes || 5));
      const rawIdleReminder = Number(info.idle_customer_reminder_minutes ?? 10);
      const idleCustomerReminder = Number.isFinite(rawIdleReminder) && rawIdleReminder > 0 ? Math.max(1, Math.floor(rawIdleReminder)) : 0;
      const minDelivery = Math.max(0, Number(info.min_delivery_order_amount || 0));
      const minPickup = Math.max(0, Number(info.min_pickup_order_amount || 0));
      const normalizedInfo = {
        ...info,
        min_order_amount: Math.max(minDelivery, minPickup),
        min_delivery_order_amount: minDelivery,
        min_pickup_order_amount: minPickup,
        cart_empty_reminder_minutes: cartReminder,
        idle_customer_reminder_minutes: idleCustomerReminder,
        stock_release_after_inactive_minutes: stockRelease,
        max_order_quantity_per_product: Math.max(10, Number(info.max_order_quantity_per_product || 10)),
        order_same_day_cutoff_time: info.order_same_day_cutoff_time || DEFAULT_SAME_DAY_CUTOFF_TIME,
        delivery_arrival_start_time: info.delivery_arrival_start_time || DEFAULT_DELIVERY_ARRIVAL_START_TIME,
        delivery_arrival_end_time: info.delivery_arrival_end_time || DEFAULT_DELIVERY_ARRIVAL_END_TIME,
      };

      await saveSettings.mutateAsync({
        info: normalizedInfo,
        regular_hours: regularHours,
        special_hours: specialHours,
        delivery_zones: deliveryZones,
      });
      setInfo(normalizedInfo);
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

  const footer = (
    <SaveFooter
      canEdit={canEdit}
      dirty={dirty}
      canSave={canSave}
      errors={validation}
      isSaving={saveSettings.isPending}
      onSave={save}
    />
  );

  const disabled = !canEdit || saveSettings.isPending;
  const zoneOptions = settings.data?.delivery_zone_options || [];
  const cartReminderValue = Number(info.cart_empty_reminder_minutes || 0);
  const idleCustomerReminderValue = Number(info.idle_customer_reminder_minutes || 0);
  const idleCustomerReminderEnabled = idleCustomerReminderValue > 0;
  const stockReleaseValue = Number(info.stock_release_after_inactive_minutes || 0);
  const maxPerProductValue = Number(info.max_order_quantity_per_product || 0);
  const cartReminderError = cartReminderValue < 5
    ? "מינימום 5 דקות"
    : cartReminderValue >= stockReleaseValue
      ? "חייב להיות נמוך מהחזרת מוצרים למלאי"
      : "";
  const idleCustomerReminderError = idleCustomerReminderValue < 0 ? "לא יכול להיות שלילי" : "";
  const stockReleaseError = stockReleaseValue < 30 ? "מינימום 30 דקות" : "";
  const maxPerProductError = maxPerProductValue < 10 ? "מינימום 10" : "";

  return (
    <div className="mt-6 grid gap-4 text-slate-900 font-sans" dir="rtl">
      <Section
        icon={Settings2}
        title="פרטי עסק וסניף"
        subtitle="המידע שהבוט והדשבורד משתמשים בו לכתובת, טלפון, כשרות, משלוחים ושעות פתיחה."
        footer={footer}
      >
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
          <div className="grid gap-4">
            <Panel title="פרטי הסניף" subtitle="שם, כתובת, יצירת קשר וכשרות">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                  <div className="mb-3 text-right text-xs font-extrabold text-slate-500">שם ומיתוג</div>
                  <div className="grid gap-3">
                    <Field label="שם הרשת">
                      <TextInput disabled={disabled} value={info.chain_name || ""} onChange={(e) => changeInfo("chain_name", e.target.value)} placeholder="לדוגמה: סופר גלסנר" />
                    </Field>
                    <Field label="שם הסניף">
                      <TextInput disabled={disabled} value={info.branch_name || ""} onChange={(e) => changeInfo("branch_name", e.target.value)} placeholder="לדוגמה: לשם" />
                    </Field>
                    <Field label="שם מלא בדשבורד">
                      <TextInput disabled={disabled} value={info.name || ""} onChange={(e) => changeInfo("name", e.target.value)} />
                    </Field>
                  </div>
                </div>

                <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                  <div className="mb-3 text-right text-xs font-extrabold text-slate-500">יצירת קשר</div>
                  <div className="grid gap-3">
                    <Field label="טלפון">
                      <TextInput disabled={disabled} value={info.phone || ""} onChange={(e) => changeInfo("phone", e.target.value)} dir="ltr" />
                    </Field>
                    <Field label="טלפון WhatsApp">
                      <TextInput disabled={disabled} value={info.whatsapp_phone || ""} onChange={(e) => changeInfo("whatsapp_phone", e.target.value)} dir="ltr" />
                    </Field>
                    <Field label="מייל">
                      <TextInput disabled={disabled} value={info.email || ""} onChange={(e) => changeInfo("email", e.target.value)} dir="ltr" />
                    </Field>
                  </div>
                </div>

                <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm md:col-span-2">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="כתובת">
                      <TextInput disabled={disabled} value={info.address || ""} onChange={(e) => changeInfo("address", e.target.value)} />
                    </Field>
                    <Field label="קישור לגוגל מפות">
                      <TextInput disabled={disabled} value={info.google_maps_url || ""} onChange={(e) => changeInfo("google_maps_url", e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" />
                    </Field>
                    <Field label="סוג כשרות" className="md:col-span-2">
                      <TextInput disabled={disabled} value={info.kashrut || ""} onChange={(e) => changeInfo("kashrut", e.target.value)} placeholder="לדוגמה: רבנות / בד״ץ / ללא תעודה" />
                    </Field>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="תיאור קצר על הסניף" subtitle="מה יוצג לבוט בתשובות כלליות">
              <TextArea disabled={disabled} rows={3} value={info.about || ""} onChange={(e) => changeInfo("about", e.target.value)} placeholder="כמה מילים על הסניף, השירותים, אזורי שירות וכו׳" />
            </Panel>
          </div>

          <div className="grid gap-4">
            <Panel title="הגדרות הזמנה ואוטומציה">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <NumberField
                  label="מינימום הזמנה למשלוח"
                  unit="₪"
                  value={info.min_delivery_order_amount ?? 0}
                  disabled={disabled}
                  onChange={(value) => changeInfo("min_delivery_order_amount", value)}
                  help="נבדק לפי סכום המוצרים בלבד, ללא דמי משלוח. אם הערך 0, אין מינימום למשלוח."
                />
                <NumberField
                  label="מינימום הזמנה לאיסוף עצמי"
                  unit="₪"
                  value={info.min_pickup_order_amount ?? 0}
                  disabled={disabled}
                  onChange={(value) => changeInfo("min_pickup_order_amount", value)}
                  help="נבדק לפי סכום המוצרים בלבד. אם הערך 0, אין מינימום לאיסוף עצמי."
                />
                <NumberField
                  label="דמי משלוח"
                  unit="₪"
                  value={info.delivery_fee ?? 0}
                  disabled={disabled}
                  onChange={(value) => changeInfo("delivery_fee", value)}
                />
                <Field
                  label="שעת קבלת הזמנות לאספקה היום"
                  help="ברירת המחדל היא 15:00. הזמנות משלוח שיאושרו עד שעה זו מיועדות לצאת היום; לאחר מכן יעברו ליום העסקים הבא. אין משלוחים בשישי ושבת."
                >
                  <TextInput
                    type="time"
                    disabled={disabled}
                    value={info.order_same_day_cutoff_time || DEFAULT_SAME_DAY_CUTOFF_TIME}
                    onChange={(e) => changeInfo("order_same_day_cutoff_time", e.target.value || DEFAULT_SAME_DAY_CUTOFF_TIME)}
                    dir="ltr"
                  />
                </Field>
                <div className="grid gap-3 rounded-2xl border border-white bg-white/80 p-3 shadow-sm sm:grid-cols-2">
                  <div className="sm:col-span-2 text-right text-xs font-extrabold text-slate-500">שעות הגעה ללקוחות באותו יום</div>
                  <Field
                    label="משעה"
                    help="תחילת חלון ההגעה המשוער שהבוט יציג ללקוחות שבוחרים משלוח."
                  >
                    <TextInput
                      type="time"
                      disabled={disabled}
                      value={info.delivery_arrival_start_time || DEFAULT_DELIVERY_ARRIVAL_START_TIME}
                      onChange={(e) => changeInfo("delivery_arrival_start_time", e.target.value || DEFAULT_DELIVERY_ARRIVAL_START_TIME)}
                      dir="ltr"
                    />
                  </Field>
                  <Field
                    label="עד שעה"
                    help="סיום חלון ההגעה המשוער שהבוט יציג ללקוחות שבוחרים משלוח."
                  >
                    <TextInput
                      type="time"
                      disabled={disabled}
                      value={info.delivery_arrival_end_time || DEFAULT_DELIVERY_ARRIVAL_END_TIME}
                      onChange={(e) => changeInfo("delivery_arrival_end_time", e.target.value || DEFAULT_DELIVERY_ARRIVAL_END_TIME)}
                      dir="ltr"
                    />
                  </Field>
                </div>
                <div className="grid gap-3 rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                  <ToggleCard
                    label="תזכורת למי שכתב ולא התחיל עגלה"
                    checked={idleCustomerReminderEnabled}
                    disabled={disabled}
                    onChange={(enabled) => changeInfo("idle_customer_reminder_minutes", enabled ? 10 : 0)}
                  />
                  {idleCustomerReminderEnabled ? (
                    <NumberField
                      label="שליחה אחרי"
                      unit="דקות"
                      min={1}
                      value={info.idle_customer_reminder_minutes ?? 10}
                      disabled={disabled}
                      onChange={(value) => changeInfo("idle_customer_reminder_minutes", value)}
                      help="אם לקוח כתב לבוט, לא התחיל עגלה ולא המשיך את השיחה — תישלח לו הודעת עזרה קצרה אחרי הזמן הזה. כיבוי המתג מבטל את הפיצ׳ר לגמרי."
                      error={idleCustomerReminderError}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-xs font-semibold leading-5 text-slate-500">
                      כבוי — לא תישלח הודעת המשך ללקוחות שלא התחילו עגלה.
                    </div>
                  )}
                </div>
                <NumberField
                  label="תזכורת לעגלה לא מאושרת"
                  unit="דקות"
                  min={5}
                  max={Math.max(5, Number(info.stock_release_after_inactive_minutes || 30) - 1)}
                  value={info.cart_empty_reminder_minutes ?? 5}
                  disabled={disabled}
                  onChange={(value) => changeInfo("cart_empty_reminder_minutes", value)}
                  help="אחרי הזמן הזה מאז העדכון האחרון בעגלה, הלקוח יקבל הודעת WhatsApp שמזכירה לאשר לפני שהמוצרים חוזרים למלאי."
                  error={cartReminderError}
                />
                <NumberField
                  label="החזרת מוצרים למלאי"
                  unit="דקות"
                  min={30}
                  value={info.stock_release_after_inactive_minutes ?? 30}
                  disabled={disabled}
                  onChange={(value) => changeInfo("stock_release_after_inactive_minutes", value)}
                  help="אחרי הזמן הזה מאז העדכון האחרון בעגלה, הזמנה שלא אושרה תבוטל אוטומטית, המוצרים יחזרו למלאי ותישלח הודעה ללקוח."
                  error={stockReleaseError}
                />
                <NumberField
                  label="מקסימום הזמנה ממוצר אחד"
                  unit="יח׳/ק״ג"
                  min={10}
                  value={info.max_order_quantity_per_product ?? 10}
                  disabled={disabled}
                  onChange={(value) => changeInfo("max_order_quantity_per_product", value)}
                  help="אם לקוח יבקש יותר מהמותר, הכמות תקוצץ אוטומטית למקסימום. במוצרי משקל המגבלה היא בק״ג."
                  error={maxPerProductError}
                />
              </div>
            </Panel>

            <Panel title="אפשרויות שירות">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <ToggleCard
                  label="תומך במשלוחים"
                  checked={info.supports_delivery}
                  disabled={disabled}
                  onChange={(value) => changeInfo("supports_delivery", value)}
                />
                <ToggleCard
                  label="תומך באיסוף עצמי"
                  checked={info.supports_pickup}
                  disabled={disabled}
                  onChange={(value) => changeInfo("supports_pickup", value)}
                />
              </div>
            </Panel>
          </div>
        </div>
      </Section>

      <Section
        icon={MapPinned}
        title="יישובי משלוח"
        subtitle="רק כתובות שמכילות אחד מהיישובים הפעילים יתקבלו במשלוח. דמי המשלוח אחידים ומוגדרים בפרטי הסניף."
        footer={footer}
      >
        <Panel title="יישובים פעילים למשלוח">
          <datalist id="delivery-zone-options">
            {zoneOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="הוסף יישוב" className="flex-1">
              <TextInput
                disabled={disabled}
                list="delivery-zone-options"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addZone();
                  }
                }}
                placeholder="לדוגמה: לשם"
              />
            </Field>
            <button className="btn-outline sm:mb-0.5" disabled={disabled || !newZoneName.trim()} onClick={() => addZone()}>
              <Plus className="h-4 w-4" />
              הוסף יישוב
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {deliveryZones.length ? (
              deliveryZones.map((zone, index) => (
                <div key={`${zone.settlement_name}-${index}`} className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 sm:grid-cols-[1fr_100px_auto] sm:items-center">
                  <TextInput disabled={disabled} value={zone.settlement_name || ""} onChange={(e) => changeZone(index, "settlement_name", e.target.value)} />
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" className="h-5 w-5 accent-slate-900" disabled={disabled} checked={Boolean(zone.is_active)} onChange={(e) => changeZone(index, "is_active", e.target.checked)} />
                    פעיל
                  </label>
                  <button
                    className="btn-outline text-rose-700 hover:bg-rose-50"
                    disabled={disabled}
                    onClick={() => {
                      setDeliveryZones((prev) => prev.filter((_, i) => i !== index));
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
                עדיין לא הוגדרו יישובי משלוח
              </div>
            )}
          </div>
        </Panel>
      </Section>

      <Section icon={Clock} title="שעות פתיחה רגילות" footer={footer}>
        <div className="grid gap-2">
          {regularHours.map((row) => {
            const day = DAYS.find((d) => d.value === row.day_of_week);
            return (
              <div key={row.day_of_week} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[90px_95px_120px_120px_1fr] sm:items-center">
                <div className="text-sm font-semibold text-slate-900">{day?.label}</div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" className="h-5 w-5 accent-slate-900" disabled={disabled} checked={Boolean(row.is_closed)} onChange={(e) => changeRegular(row.day_of_week, "is_closed", e.target.checked)} />
                  סגור
                </label>
                <TextInput type="time" value={row.open_time || ""} disabled={disabled || row.is_closed} onChange={(e) => changeRegular(row.day_of_week, "open_time", e.target.value)} />
                <TextInput type="time" value={row.close_time || ""} disabled={disabled || row.is_closed} onChange={(e) => changeRegular(row.day_of_week, "close_time", e.target.value)} />
                <TextInput value={row.note || ""} disabled={disabled} onChange={(e) => changeRegular(row.day_of_week, "note", e.target.value)} placeholder="הערה" />
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        icon={Clock}
        title="שעות פתיחה מיוחדות"
        subtitle="חגים, ערבי חג, ימי סגירה חריגים או שעות שונות מהרגיל."
        footer={footer}
      >
        <div className="mb-3 flex justify-start">
          <button
            className="btn-outline"
            disabled={disabled}
            onClick={() => {
              setSpecialHours((prev) => [...prev, newSpecialRow()]);
              setDirty(true);
            }}
          >
            <Plus className="h-4 w-4" />
            הוסף יום מיוחד
          </button>
        </div>

        <div className="grid gap-2">
          {specialHours.length ? (
            specialHours.map((row, index) => (
              <div key={`${row.special_date || "new"}-${index}`} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[145px_1fr_90px_120px_120px_1fr_auto] sm:items-center">
                <TextInput disabled={disabled} type="date" value={row.special_date || ""} onChange={(e) => changeSpecial(index, "special_date", e.target.value)} />
                <TextInput disabled={disabled} value={row.label || ""} onChange={(e) => changeSpecial(index, "label", e.target.value)} placeholder="שם היום / חג" />
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" className="h-5 w-5 accent-slate-900" disabled={disabled} checked={Boolean(row.is_closed)} onChange={(e) => changeSpecial(index, "is_closed", e.target.checked)} />
                  סגור
                </label>
                <TextInput type="time" value={row.open_time || ""} disabled={disabled || row.is_closed} onChange={(e) => changeSpecial(index, "open_time", e.target.value)} />
                <TextInput type="time" value={row.close_time || ""} disabled={disabled || row.is_closed} onChange={(e) => changeSpecial(index, "close_time", e.target.value)} />
                <TextInput disabled={disabled} value={row.note || ""} onChange={(e) => changeSpecial(index, "note", e.target.value)} placeholder="הערה" />
                <button
                  className="btn-outline text-rose-700 hover:bg-rose-50"
                  disabled={disabled}
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
