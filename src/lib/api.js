const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const SHOP_ID = Number(import.meta.env.VITE_SHOP_ID || "1");

async function fetchJSON(path, init) {
  const url = API_BASE ? new URL(path, API_BASE).toString() : path;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

function toBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string")
    return ["1", "true", "yes", "כן"].includes(v.toLowerCase());
  return fallback;
}

function normalizeItem(raw) {
  return {
    id: Number(raw.id ?? raw.order_item_id ?? raw.orderItemId),
    name: String(
      raw.name ?? raw.product_name ?? raw.label ?? raw.title ?? "מוצר",
    ),
    amount: Number(raw.amount ?? raw.qty ?? raw.quantity ?? 1),
    unit: raw.unit ?? raw.units ?? raw.unit_label ?? null,
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
    customer_name: raw.customer_name ?? raw.customerName ?? raw.name ?? null,
    customer_phone:
      raw.customer_phone ?? raw.customerPhone ?? raw.phone ?? null,
    customer_notes:
      raw.customer_notes ?? raw.customerNotes ?? raw.notes ?? null,
    items: Array.isArray(itemsRaw) ? itemsRaw.map(normalizeItem) : [],
  };
}

export async function getPickerOrders() {
  const res = await fetchJSON(
    `/api/dashboard/picker/orders?shop_id=${SHOP_ID}&status=confirmed,preparing`,
  );
  const rawOrders = res.orders ?? res.data ?? res;
  return Array.isArray(rawOrders) ? rawOrders.map(normalizeOrder) : [];
}

export async function setOrderStatus(orderId, status) {
  const res = await fetchJSON(
    `/api/dashboard/picker/orders/${orderId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
  return normalizeOrder(res.order ?? res.data ?? res);
}

export async function setItemPicked(orderItemId, picked) {
  const res = await fetchJSON(
    `/api/dashboard/picker/order-items/${orderItemId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ picked }),
    },
  );
  return normalizeItem(res.item ?? res.data ?? res);
}

export function getShopId() {
  return SHOP_ID;
}
