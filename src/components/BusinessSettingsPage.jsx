import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock,
  CreditCard,
  Lock,
  MapPinned,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Store,
  TimerReset,
  Trash2,
  Truck,
} from "lucide-react";
import {
  useBusinessSettings,
  useCreateStaffWhatsappRecipient,
  useDeleteStaffWhatsappRecipient,
  useSendStaffWhatsappRecipientTest,
  useStaffWhatsappRecipients,
  useUpdateBusinessSettings,
  useUpdateStaffWhatsappRecipient,
} from "../lib/hooks";

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
  market_day_promotions_enabled: false,
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

function normalizePhonePreview(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

function formatIsraeliPhoneDisplay(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";

  const local = digits.startsWith("972") ? `0${digits.slice(3)}` : digits;

  if (local.length === 10) {
    return `${local.slice(0, 3)}-${local.slice(3)}`;
  }

  if (local.length === 9 && local.startsWith("0")) {
    return `${local.slice(0, 2)}-${local.slice(2)}`;
  }

  return local;
}

function isValidWhatsappPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return false;

  // Israeli mobile/local numbers or an international number without the + sign.
  return /^05\d{8}$/.test(digits) || /^9725\d{8}$/.test(digits) || /^[1-9]\d{7,14}$/.test(digits);
}

function getFriendlyStaffWhatsappError(err) {
  const details = err?.details;
  const errorPayload = typeof details === "string" ? details : JSON.stringify(details || {});
  const message = String(err?.message || "");
  const haystack = `${message} ${errorPayload}`.toLowerCase();

  if (
    haystack.includes("132001") ||
    haystack.includes("template name does not exist") ||
    haystack.includes("does not exist in he") ||
    haystack.includes("does not exist in he_il") ||
    haystack.includes("template_not_found") ||
    haystack.includes("template not approved")
  ) {
    return "תבנית ההתראה עדיין לא אושרה על ידי Meta, או שהיא לא קיימת בחשבון ה-WhatsApp של הסניף. אחרי שהאישור יושלם נסה שוב.";
  }

  if (haystack.includes("131030") || haystack.includes("allowed list")) {
    return "המספר הזה עדיין לא מורשה לקבל הודעות ממספר בדיקה של Meta. בפרודקשן אמיתי זה לא אמור לקרות.";
  }

  if (haystack.includes("132000") || haystack.includes("parameter") || haystack.includes("translation")) {
    return "יש חוסר התאמה בין משתני התבנית בקוד לבין התבנית שהוגדרה ב-Meta. צריך לבדוק את מבנה המשתנים.";
  }

  if (err?.status === 404 && !message) {
    return "פעולת שליחת הבדיקה לא זמינה כרגע בשרת. בדוק שהשרת עודכן לגרסה החדשה.";
  }

  return message || "שגיאה בשליחת הודעת בדיקה";
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function Field({ label, help, error, children, className = "" }) {
  return (
    <label className={`grid gap-1.5 text-right ${className}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {help ? <span className="text-xs leading-5 text-slate-500">{help}</span> : null}
      {error ? <span className="text-xs font-medium leading-5 text-rose-600">{error}</span> : null}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} className={`${inputClass} ${props.className || ""}`} />;
}

function TextArea(props) {
  return <textarea {...props} className={`${inputClass} min-h-24 resize-y leading-6 ${props.className || ""}`} />;
}

function IconBox({ icon: Icon }) {
  if (!Icon) return null;
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
      <Icon className="h-5 w-5" />
    </div>
  );
}

const sectionToneClasses = {
  slate: "from-sky-50/80 via-white to-white",
  green: "from-sky-50/80 via-white to-white",
  blue: "from-sky-50/80 via-white to-white",
  amber: "from-sky-50/80 via-white to-white",
  violet: "from-sky-50/80 via-white to-white",
};

function PageSection({ icon, title, subtitle, children, tone = "slate", headerExtra = null }) {
  return (
    <section className={`card bg-gradient-to-br ${sectionToneClasses[tone] || sectionToneClasses.slate} p-5 sm:p-6`}>
      <div className="mb-5 flex flex-col gap-4 text-right lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <IconBox icon={icon} />
          <div>
            <h2 className="m-0 text-lg font-semibold leading-7 text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {headerExtra ? <div className="w-full lg:w-auto lg:max-w-xl">{headerExtra}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Block({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-sky-100 bg-sky-50/70 p-4 ${className}`}>
      <div className="mb-4 text-right">
        <div className="text-sm font-semibold text-slate-950">{title}</div>
        {subtitle ? <div className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange, unit, help, min = 0, max, error, disabled }) {
  return (
    <Field label={label} help={help} error={error}>
      <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
        <input
          type="number"
          min={min}
          max={max}
          step="1"
          value={value ?? min}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-left text-sm font-normal tabular-nums text-slate-900 outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          dir="ltr"
        />
        <span className="shrink-0 border-s border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
          {unit}
        </span>
      </div>
    </Field>
  );
}

function SwitchRow({ label, sublabel, checked, onChange, disabled }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
      <span className="text-right">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {sublabel ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{sublabel}</span> : null}
      </span>
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function CompactSwitchRow({ label, sublabel, checked, onChange, disabled }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <span className="text-right">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {sublabel ? <span className="mt-0.5 block text-xs leading-5 text-slate-500">{sublabel}</span> : null}
      </span>
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function StatusPill({ active, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {children}
    </span>
  );
}

function SaveActions({ canEdit, dirty, canSave, errors, isSaving, onSave }) {
  if (!canEdit) {
    return (
      <div className="card mt-5 flex items-center justify-end gap-2 p-4 text-sm text-slate-600">
        <Lock className="h-4 w-4" />
        רק מנהל יכול לערוך את הפרטים.
      </div>
    );
  }

  return (
    <div className="card mt-5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-right text-sm text-slate-600">
          {errors?.length ? (
            <span className="text-rose-600">{errors[0]}</span>
          ) : dirty ? (
            <span className="text-amber-700">יש שינויים שלא נשמרו.</span>
          ) : (
            <span>כל השינויים שמורים.</span>
          )}
        </div>
        <button className="btn-primary px-6" onClick={onSave} disabled={!canSave}>
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          שמור שינויים
        </button>
      </div>
    </div>
  );
}

function HeaderSaveButton({ canEdit, canSave, isSaving, onSave }) {
  if (!canEdit) return null;

  return (
    <button className="btn-primary px-5" onClick={onSave} disabled={!canSave}>
      {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      שמור
    </button>
  );
}

export function BusinessSettingsPage({ user, onNotify, onRegisterRefetch, onFetchingChange }) {
  const settings = useBusinessSettings();
  const saveSettings = useUpdateBusinessSettings();
  const staffRecipients = useStaffWhatsappRecipients();
  const createStaffRecipient = useCreateStaffWhatsappRecipient();
  const updateStaffRecipient = useUpdateStaffWhatsappRecipient();
  const deleteStaffRecipient = useDeleteStaffWhatsappRecipient();
  const testStaffRecipient = useSendStaffWhatsappRecipientTest();
  const [info, setInfo] = useState(EMPTY_INFO);
  const [regularHours, setRegularHours] = useState(emptyRegularHours);
  const [specialHours, setSpecialHours] = useState([]);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [newZoneName, setNewZoneName] = useState("");
  const [newStaffRecipient, setNewStaffRecipient] = useState({ phone: "" });
  const [showStaffRecipients, setShowStaffRecipients] = useState(true);
  const [showDeliveryZones, setShowDeliveryZones] = useState(true);
  const [dirty, setDirty] = useState(false);
  const canEdit = user?.role === "admin";

  useEffect(() => {
    onRegisterRefetch?.(settings.refetch);
  }, [onRegisterRefetch, settings.refetch]);

  useEffect(() => {
    onFetchingChange?.(
      settings.isFetching ||
        saveSettings.isPending ||
        staffRecipients.isFetching ||
        createStaffRecipient.isPending ||
        updateStaffRecipient.isPending ||
        deleteStaffRecipient.isPending ||
        testStaffRecipient.isPending,
    );
  }, [
    onFetchingChange,
    settings.isFetching,
    saveSettings.isPending,
    staffRecipients.isFetching,
    createStaffRecipient.isPending,
    updateStaffRecipient.isPending,
    deleteStaffRecipient.isPending,
    testStaffRecipient.isPending,
  ]);

  useEffect(() => {
    if (!settings.data) return;
    const dataInfo = { ...EMPTY_INFO, ...settings.data.info };
    const legacyMin = Number(dataInfo.min_order_amount || 0);
    setInfo({
      ...dataInfo,
      min_delivery_order_amount: dataInfo.min_delivery_order_amount ?? legacyMin,
      min_pickup_order_amount: dataInfo.min_pickup_order_amount ?? legacyMin,
      cart_empty_reminder_minutes:
        Number(dataInfo.cart_empty_reminder_minutes || 0) < 5 ? 5 : dataInfo.cart_empty_reminder_minutes,
      idle_customer_reminder_minutes: Number(dataInfo.idle_customer_reminder_minutes ?? 10),
      market_day_promotions_enabled: Boolean(dataInfo.market_day_promotions_enabled),
      stock_release_after_inactive_minutes:
        Number(dataInfo.stock_release_after_inactive_minutes || 0) < 30
          ? 30
          : dataInfo.stock_release_after_inactive_minutes,
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
    setRegularHours((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, [key]: value } : r)));
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

  async function addStaffRecipient() {
    if (!canEdit) return;
    const phone = normalizePhonePreview(newStaffRecipient.phone);

    if (!phone) {
      onNotify?.("error", "חובה למלא מספר WhatsApp");
      return;
    }

    if (!isValidWhatsappPhone(newStaffRecipient.phone)) {
      onNotify?.("error", "המספר לא תקין. יש להזין מספר ישראלי תקין, למשל 0501234567.");
      return;
    }

    try {
      await createStaffRecipient.mutateAsync({
        phone,
        is_active: true,
        notify_new_orders: true,
      });
      setNewStaffRecipient({ phone: "" });
      onNotify?.("success", "המספר נוסף להתראות הצוות");
    } catch (err) {
      onNotify?.("error", err?.message || "שגיאה בהוספת מספר התראה");
    }
  }

  async function updateStaffRecipientField(recipient, key, value) {
    if (!canEdit) return;
    try {
      await updateStaffRecipient.mutateAsync({
        id: recipient.id,
        payload: { [key]: value },
      });
      onNotify?.("success", "המספר עודכן");
    } catch (err) {
      onNotify?.("error", err?.message || "שגיאה בעדכון המספר");
    }
  }

  async function removeStaffRecipient(recipient) {
    if (!canEdit) return;
    const ok = window.confirm(`למחוק את ${formatIsraeliPhoneDisplay(recipient.phone)} מרשימת ההתראות?`);
    if (!ok) return;

    try {
      await deleteStaffRecipient.mutateAsync(recipient.id);
      onNotify?.("success", "המספר נמחק מרשימת ההתראות");
    } catch (err) {
      onNotify?.("error", err?.message || "שגיאה במחיקת המספר");
    }
  }

  async function sendStaffTest(recipient) {
    if (!canEdit) return;
    try {
      await testStaffRecipient.mutateAsync(recipient.id);
      onNotify?.("success", "נשלחה הודעת בדיקה ב-WhatsApp");
    } catch (err) {
      onNotify?.("error", getFriendlyStaffWhatsappError(err));
    }
  }

  async function save() {
    if (!canSave) return;
    try {
      const stockRelease = Math.max(30, Number(info.stock_release_after_inactive_minutes || 30));
      const cartReminder = Math.max(5, Number(info.cart_empty_reminder_minutes || 5));
      const rawIdleReminder = Number(info.idle_customer_reminder_minutes ?? 10);
      const idleCustomerReminder =
        Number.isFinite(rawIdleReminder) && rawIdleReminder > 0 ? Math.max(1, Math.floor(rawIdleReminder)) : 0;
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
    return <div className="mt-6 card p-8 text-center text-sm text-slate-600">טוען פרטי עסק…</div>;
  }

  if (settings.error) {
    return (
      <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-right text-sm text-rose-900">
        <div className="font-medium">שגיאה בטעינת פרטי העסק</div>
        <div className="mt-1">{settings.error.message}</div>
        <button className="btn-outline mt-3" onClick={() => settings.refetch()}>
          נסה שוב
        </button>
      </div>
    );
  }

  const disabled = !canEdit || saveSettings.isPending;
  const cartReminderValue = Number(info.cart_empty_reminder_minutes || 0);
  const idleCustomerReminderValue = Number(info.idle_customer_reminder_minutes || 0);
  const idleCustomerReminderEnabled = idleCustomerReminderValue > 0;
  const stockReleaseValue = Number(info.stock_release_after_inactive_minutes || 0);
  const maxPerProductValue = Number(info.max_order_quantity_per_product || 0);
  const cartReminderError =
    cartReminderValue < 5
      ? "מינימום 5 דקות"
      : cartReminderValue >= stockReleaseValue
        ? "חייב להיות נמוך מהחזרת מוצרים למלאי"
        : "";
  const idleCustomerReminderError = idleCustomerReminderValue < 0 ? "לא יכול להיות שלילי" : "";
  const stockReleaseError = stockReleaseValue < 30 ? "מינימום 30 דקות" : "";
  const maxPerProductError = maxPerProductValue < 10 ? "מינימום 10" : "";
  const staffRecipientsList = staffRecipients.data || [];
  const staffActionBusy =
    createStaffRecipient.isPending ||
    updateStaffRecipient.isPending ||
    deleteStaffRecipient.isPending ||
    testStaffRecipient.isPending;
  const staffDisabled = disabled || staffActionBusy;
  const newStaffPhonePreview = normalizePhonePreview(newStaffRecipient.phone);

  return (
    <div className="mt-6 grid gap-5 text-slate-900" dir="rtl">
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3 text-right">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="m-2 text-xl font-semibold leading-7 text-slate-950">פרטי עסק וסניף</h1>
            </div>
          </div>
          <HeaderSaveButton
            canEdit={canEdit}
            dirty={dirty}
            canSave={canSave}
            errors={validation}
            isSaving={saveSettings.isPending}
            onSave={save}
          />
        </div>
      </div>

      <PageSection icon={Store} tone="blue" title="פרטי סניף" subtitle="שם, קשר, כתובת והטקסט שהבוט משתמש בו בתשובות כלליות.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Block title="שם ומיתוג">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="שם הרשת">
                <TextInput disabled={disabled} value={info.chain_name || ""} onChange={(e) => changeInfo("chain_name", e.target.value)} placeholder="לדוגמה: סופר גלסנר" />
              </Field>
              <Field label="שם הסניף">
                <TextInput disabled={disabled} value={info.branch_name || ""} onChange={(e) => changeInfo("branch_name", e.target.value)} placeholder="לדוגמה: לשם" />
              </Field>
              <Field label="שם בדשבורד" className="sm:col-span-2">
                <TextInput disabled={disabled} value={info.name || ""} onChange={(e) => changeInfo("name", e.target.value)} placeholder="שם הסניף כפי שיוצג במערכת" />
              </Field>
            </div>
          </Block>

          <Block title="יצירת קשר">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="טלפון">
                <TextInput disabled={disabled} value={formatIsraeliPhoneDisplay(info.phone) || ""} onChange={(e) => changeInfo("phone", e.target.value)} dir="ltr" />
              </Field>
              <Field label="טלפון WhatsApp">
                <TextInput disabled={disabled} value={formatIsraeliPhoneDisplay(info.whatsapp_phone) || ""} onChange={(e) => changeInfo("whatsapp_phone", e.target.value)} dir="ltr" />
              </Field>
              <Field label="מייל" className="sm:col-span-2">
                <TextInput disabled={disabled} value={info.email || ""} onChange={(e) => changeInfo("email", e.target.value)} dir="ltr" />
              </Field>
            </div>
          </Block>

          <Block title="מיקום וכשרות" className="lg:col-span-2">
            <div className="grid gap-3 lg:grid-cols-3">
              <Field label="כתובת" className="lg:col-span-2">
                <TextInput disabled={disabled} value={info.address || ""} onChange={(e) => changeInfo("address", e.target.value)} />
              </Field>
              <Field label="סוג כשרות">
                <TextInput disabled={disabled} value={info.kashrut || ""} onChange={(e) => changeInfo("kashrut", e.target.value)} />
              </Field>
              <Field label="קישור לגוגל מפות" className="lg:col-span-3">
                <TextInput disabled={disabled} value={info.google_maps_url || ""} onChange={(e) => changeInfo("google_maps_url", e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" />
              </Field>
            </div>
          </Block>

          <Block title="תיאור קצר לבוט" className="lg:col-span-2">
            <TextArea disabled={disabled} rows={3} value={info.about || ""} onChange={(e) => changeInfo("about", e.target.value)} placeholder="כמה מילים על הסניף, השירותים ואזורי השירות." />
          </Block>
        </div>
      </PageSection>

      <PageSection icon={Truck} tone="green" title="הזמנות, משלוחים ואוטומציות" subtitle="עמלות, זמני משלוח, מגבלות ותזכורות אוטומטיות.">
        <div className="grid gap-4 xl:grid-cols-2">
          <Block title="אפשרויות שירות">
            <div className="grid gap-2 sm:grid-cols-2">
              <SwitchRow
                label="משלוחים"
                sublabel="הלקוח יוכל לבחור משלוח עד הבית"
                checked={info.supports_delivery}
                disabled={disabled}
                onChange={(value) => changeInfo("supports_delivery", value)}
              />
              <SwitchRow
                label="איסוף עצמי"
                sublabel="הלקוח יוכל להגיע לאסוף מהסניף"
                checked={info.supports_pickup}
                disabled={disabled}
                onChange={(value) => changeInfo("supports_pickup", value)}
              />
              <SwitchRow
                label="מבצעי יום השוק"
                sublabel="מציג תת טאב ייעודי במבצעים ומאפשר לסמן מבצעים כיום השוק"
                checked={info.market_day_promotions_enabled}
                disabled={disabled}
                onChange={(value) => changeInfo("market_day_promotions_enabled", value)}
              />
            </div>
          </Block>

          <Block title="עמלות בסיסיות">
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField label="מינימום למשלוח" unit="₪" value={info.min_delivery_order_amount ?? 0} disabled={disabled} onChange={(value) => changeInfo("min_delivery_order_amount", value)} />
              <NumberField label="מינימום לאיסוף" unit="₪" value={info.min_pickup_order_amount ?? 0} disabled={disabled} onChange={(value) => changeInfo("min_pickup_order_amount", value)} />
              <NumberField label="דמי משלוח" unit="₪" value={info.delivery_fee ?? 0} disabled={disabled} onChange={(value) => changeInfo("delivery_fee", value)} />
            </div>
          </Block>

          <Block title="זמני משלוח">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="אישור להיום עד">
                <TextInput type="time" disabled={disabled} value={info.order_same_day_cutoff_time || DEFAULT_SAME_DAY_CUTOFF_TIME} onChange={(e) => changeInfo("order_same_day_cutoff_time", e.target.value || DEFAULT_SAME_DAY_CUTOFF_TIME)} dir="ltr" />
              </Field>
              <Field label="חלון הגעה משעה">
                <TextInput type="time" disabled={disabled} value={info.delivery_arrival_start_time || DEFAULT_DELIVERY_ARRIVAL_START_TIME} onChange={(e) => changeInfo("delivery_arrival_start_time", e.target.value || DEFAULT_DELIVERY_ARRIVAL_START_TIME)} dir="ltr" />
              </Field>
              <Field label="חלון הגעה עד">
                <TextInput type="time" disabled={disabled} value={info.delivery_arrival_end_time || DEFAULT_DELIVERY_ARRIVAL_END_TIME} onChange={(e) => changeInfo("delivery_arrival_end_time", e.target.value || DEFAULT_DELIVERY_ARRIVAL_END_TIME)} dir="ltr" />
              </Field>
            </div>
          </Block>

          <Block title="אוטומציות">
            <div className="grid gap-3 sm:grid-cols-2">
              <CompactSwitchRow
                label="שליחת תזכורת למי שהתחיל שיחה ולא המשיך"
                checked={idleCustomerReminderEnabled}
                disabled={disabled}
                onChange={(enabled) => changeInfo("idle_customer_reminder_minutes", enabled ? 10 : 0)}
              />
              <NumberField
                label="שליחה אחרי"
                unit="דקות"
                min={1}
                value={info.idle_customer_reminder_minutes ?? 10}
                disabled={disabled || !idleCustomerReminderEnabled}
                onChange={(value) => changeInfo("idle_customer_reminder_minutes", value)}
                error={idleCustomerReminderError}
              />
              <NumberField
                label="תזכורת לעגלה לא מאושרת"
                unit="דקות"
                min={5}
                max={Math.max(5, Number(info.stock_release_after_inactive_minutes || 30) - 1)}
                value={info.cart_empty_reminder_minutes ?? 5}
                disabled={disabled}
                onChange={(value) => changeInfo("cart_empty_reminder_minutes", value)}
                error={cartReminderError}
              />
              <NumberField
                label="החזרת מוצרים למלאי"
                unit="דקות"
                min={30}
                value={info.stock_release_after_inactive_minutes ?? 30}
                disabled={disabled}
                onChange={(value) => changeInfo("stock_release_after_inactive_minutes", value)}
                error={stockReleaseError}
              />
              <NumberField
                label="מקסימום ממוצר אחד"
                unit="יח׳/ק״ג"
                min={10}
                value={info.max_order_quantity_per_product ?? 10}
                disabled={disabled}
                onChange={(value) => changeInfo("max_order_quantity_per_product", value)}
                error={maxPerProductError}
              />
            </div>
          </Block>
        </div>
      </PageSection>

      <PageSection
        icon={BellRing}
        tone="amber"
        title="התראות WhatsApp לצוות"
        subtitle="מספרים פעילים יקבלו הודעה בכל אישור הזמנה חדשה."
        headerExtra={
          <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto] sm:items-end">
              <Field label="הוספת מספר WhatsApp">
                <TextInput
                  disabled={staffDisabled}
                  value={newStaffRecipient.phone}
                  onChange={(e) => setNewStaffRecipient((prev) => ({ ...prev, phone: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addStaffRecipient();
                    }
                  }}
                  placeholder="0501234567"
                  dir="ltr"
                />
              </Field>
              <button className="btn-primary sm:min-w-[130px]" disabled={staffDisabled || !newStaffPhonePreview} onClick={addStaffRecipient}>
                <Plus className="h-4 w-4" />
                הוסף מספר
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white/90 shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 bg-sky-50/90 px-4 py-3 text-right text-sm text-slate-700 transition hover:bg-sky-100/70"
              onClick={() => setShowStaffRecipients((prev) => !prev)}
            >
              <span className="font-semibold text-slate-950">רשימת מספרים</span>
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                {staffRecipientsList.length ? `${staffRecipientsList.length} מספרים` : "אין מספרים"}
                {showStaffRecipients ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {showStaffRecipients ? (
              staffRecipientsList.length ? (
                <table className="w-full table-fixed border-collapse text-right text-sm">
                  <colgroup>
                    <col className="w-[45%]" />
                    <col className="w-[20%]" />
                    <col className="w-[35%]" />
                  </colgroup>
                  <thead className="bg-sky-50/80 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-right">מספר</th>
                      <th className="px-4 py-3 font-semibold text-center">סטטוס</th>
                      <th className="px-4 py-3 font-semibold text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {staffRecipientsList.map((recipient) => (
                      <tr key={recipient.id} className="align-middle">
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium text-slate-950" dir="ltr">{formatIsraeliPhoneDisplay(recipient.phone)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-slate-900"
                              disabled={staffDisabled}
                              checked={Boolean(recipient.is_active)}
                              onChange={(e) => updateStaffRecipientField(recipient, "is_active", e.target.checked)}
                            />
                            <StatusPill active={Boolean(recipient.is_active)}>{recipient.is_active ? "פעיל" : "כבוי"}</StatusPill>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-2" dir="rtl">
                            <button className="btn-outline px-3" disabled={staffDisabled || !recipient.is_active} onClick={() => sendStaffTest(recipient)}>
                              {testStaffRecipient.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                              בדיקה
                            </button>
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={staffDisabled}
                              onClick={() => removeStaffRecipient(recipient)}
                            >
                              <Trash2 className="h-4 w-4" />
                              מחק
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-sm text-slate-500">
                  <CircleAlert className="mx-auto mb-2 h-5 w-5 text-slate-400" />
                  עדיין לא הוגדרו מספרים לקבלת התראות.
                </div>
              )
            ) : null}
          </div>
        </div>
      </PageSection>

      <PageSection icon={MapPinned} tone="violet" title="יישובי משלוח" subtitle="רק כתובות שמכילות יישוב פעיל יתקבלו במשלוח.">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="הוסף יישוב" className="flex-1">
            <TextInput
              disabled={disabled}
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

        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white/90 shadow-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 bg-sky-50/90 px-4 py-3 text-right text-sm text-slate-700 transition hover:bg-sky-100/70"
            onClick={() => setShowDeliveryZones((prev) => !prev)}
          >
            <span className="font-semibold text-slate-950">רשימת יישובים</span>
            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
              {deliveryZones.length ? `${deliveryZones.length} יישובים` : "אין יישובים"}
              {showDeliveryZones ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>

          {showDeliveryZones ? (
            <div className="grid gap-2 p-3">
              {deliveryZones.length ? (
                deliveryZones.map((zone, index) => (
                  <div key={`${zone.settlement_name}-${index}`} className="grid gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 sm:grid-cols-[1fr_100px_auto] sm:items-center">
                    <TextInput disabled={disabled} value={zone.settlement_name || ""} onChange={(e) => changeZone(index, "settlement_name", e.target.value)} />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
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
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                  עדיין לא הוגדרו יישובי משלוח
                </div>
              )}
            </div>
          ) : null}
        </div>
      </PageSection>

      <PageSection icon={Clock} tone="slate" title="שעות פתיחה רגילות">
        <div className="grid gap-2">
          {regularHours.map((row) => {
            const day = DAYS.find((d) => d.value === row.day_of_week);
            return (
              <div key={row.day_of_week} className="grid gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 sm:grid-cols-[90px_95px_120px_120px_1fr] sm:items-center">
                <div className="text-sm font-medium text-slate-900">{day?.label}</div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
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
      </PageSection>

      <PageSection icon={Clock} tone="slate" title="שעות פתיחה מיוחדות" subtitle="חגים, ערבי חג, ימי סגירה חריגים או שעות שונות מהרגיל.">
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
              <div key={`${row.special_date || "new"}-${index}`} className="grid gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 sm:grid-cols-[145px_1fr_90px_120px_120px_1fr_auto] sm:items-center">
                <TextInput disabled={disabled} type="date" value={row.special_date || ""} onChange={(e) => changeSpecial(index, "special_date", e.target.value)} />
                <TextInput disabled={disabled} value={row.label || ""} onChange={(e) => changeSpecial(index, "label", e.target.value)} placeholder="שם היום / חג" />
                <label className="flex items-center gap-2 text-sm text-slate-700">
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
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
              עדיין אין שעות מיוחדות
            </div>
          )}
        </div>
      </PageSection>

      <SaveActions
        canEdit={canEdit}
        dirty={dirty}
        canSave={canSave}
        errors={validation}
        isSaving={saveSettings.isPending}
        onSave={save}
      />
    </div>
  );
}
