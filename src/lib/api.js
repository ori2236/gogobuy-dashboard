const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const SHOP_ID = Number(import.meta.env.VITE_SHOP_ID || "1");

async function fetchJSON(path, init) {
  const url = API_BASE ? new URL(path, API_BASE).toString() : path;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  const ct = res.headers.get("content-type") || "";
  const raw = await res.text().catch(() => "");

  if (res.ok) {
    if (ct.includes("application/json")) return raw ? JSON.parse(raw) : {};
    return raw;
  }

  let msg = "";
  if (ct.includes("application/json")) {
    try {
      const j = raw ? JSON.parse(raw) : {};
      msg = j.message || j.error || j.msg || "";
    } catch {}
  }

  const looksLikeHtml =
    raw.trim().startsWith("<!DOCTYPE") || raw.includes("<html");
  if (!msg) {
    msg = looksLikeHtml
      ? "הנתיב לא קיים / אין Proxy לשרת. בדוק שהדשבורד מדבר עם פורט 3000 ושיש Route מתאים."
      : (raw || `HTTP ${res.status}`).slice(0, 300);
  }

  const err = new Error(msg);
  err.status = res.status;
  err.url = url;
  err.details = raw;
  throw err;
}

function toBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string")
    return ["1", "true", "yes", "כן"].includes(v.toLowerCase());
  return fallback;
}

function normalizeItem(raw) {
  const soldByWeight = toBool(raw.sold_by_weight ?? raw.soldByWeight, false);
  const unit =
    raw.unit ?? raw.units ?? raw.unit_label ?? (soldByWeight ? 'ק"ג' : "יח'");

  return {
    id: Number(raw.id ?? raw.order_item_id ?? raw.orderItemId),
    name: String(
      raw.name ?? raw.product_name ?? raw.label ?? raw.title ?? "מוצר",
    ),
    amount: Number(raw.amount ?? raw.qty ?? raw.quantity ?? 1),
    unit,
    sold_by_weight: soldByWeight,
    requested_units: raw.requested_units ?? raw.requestedUnits ?? null,
    picked: toBool(
      raw.picked ?? raw.is_picked ?? raw.isPicked ?? raw.picked_up,
      false,
    ),
    notes: raw.notes ?? raw.comment ?? null,
  };
}

function normalizeOrder(raw) {
  const itemsRaw =
    raw.items ?? raw.order_items ?? raw.orderItems ?? raw.lines ?? [];
  return {
    id: Number(raw.id ?? raw.order_id ?? raw.orderId),
    shop_id: Number(raw.shop_id ?? raw.shopId ?? SHOP_ID),
    status: raw.status ?? "confirmed",
    created_at: raw.created_at ?? raw.createdAt,
    picker_note: raw.picker_note ?? raw.pickerNote ?? null,
    customer_name: raw.customer_name ?? raw.customerName ?? raw.name ?? null,
    customer_phone:
      raw.customer_phone ?? raw.customerPhone ?? raw.phone ?? null,
    customer_notes:
      raw.customer_notes ?? raw.customerNotes ?? raw.notes ?? null,
    items: Array.isArray(itemsRaw) ? itemsRaw.map(normalizeItem) : [],
  };
}

export async function getPickerOrders(statuses) {
  const statusParam =
    Array.isArray(statuses) && statuses.length
      ? statuses.join(",")
      : "confirmed,preparing";

  const res = await fetchJSON(
    `/api/dashboard/picker/orders?shop_id=${SHOP_ID}&status=${encodeURIComponent(statusParam)}`,
  );

  const rawOrders = res.orders ?? res.data ?? res;
  return Array.isArray(rawOrders) ? rawOrders.map(normalizeOrder) : [];
}

export async function setOrderStatus(orderId, status, pickerNote) {
  const body = { status };
  if (pickerNote !== undefined) body.picker_note = pickerNote;

  return await fetchJSON(`/api/dashboard/picker/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function getShopId() {
  return SHOP_ID;
}
