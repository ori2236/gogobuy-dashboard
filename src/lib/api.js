const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const FALLBACK_SHOP_ID = Number(import.meta.env.VITE_SHOP_ID || "1");
const AUTH_TOKEN_KEY = "gogobuy_dashboard_token_v1";

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function decodeDashboardTokenPayload() {
  const token = getAuthToken();
  const encoded = String(token || "").split(".")[0];
  if (!encoded) return null;

  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getShopId() {
  const fromToken = Number(decodeDashboardTokenPayload()?.shop_id);
  return Number.isFinite(fromToken) && fromToken > 0 ? fromToken : FALLBACK_SHOP_ID;
}

export function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token || "");
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function fetchJSON(path, init) {
  const url = API_BASE ? new URL(path, API_BASE).toString() : path;
  const token = getAuthToken();

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
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
    } catch {
      // Ignore malformed error bodies and fall back to the raw response.
    }
  }

  const looksLikeHtml =
    raw.trim().startsWith("<!DOCTYPE") || raw.includes("<html");
  if (!msg) {
    msg = looksLikeHtml
      ? "הנתיב לא קיים / אין Proxy לשרת. בדוק שהדשבורד מדבר עם פורט 3000 ושיש Route מתאים."
      : (raw || `HTTP ${res.status}`).slice(0, 300);
  }

  if (res.status === 401) {
    clearAuthToken();
    window.dispatchEvent(new CustomEvent("dashboard-auth-expired"));
  }

  const err = new Error(msg);
  err.status = res.status;
  err.url = url;
  err.details = raw;
  throw err;
}

export async function loginDashboard(username, password) {
  const res = await fetchJSON("/api/dashboard/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (res.token) setAuthToken(res.token);
  return res;
}

export async function getDashboardMe() {
  return await fetchJSON("/api/dashboard/auth/me");
}

export function logoutDashboard() {
  clearAuthToken();
}

function toBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string")
    return ["1", "true", "yes", "כן"].includes(v.toLowerCase());
  return fallback;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
    supplied_amount:
      raw.supplied_amount ?? raw.suppliedAmount ?? raw.provided_amount ?? null,
    picker_note:
      raw.picker_note ?? raw.pickerNote ?? raw.item_picker_note ?? raw.itemPickerNote ?? null,
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
    shop_id: Number(raw.shop_id ?? raw.shopId ?? getShopId()),
    status: raw.status ?? "confirmed",
    created_at: raw.created_at ?? raw.createdAt,
    picker_note: raw.picker_note ?? raw.pickerNote ?? null,
    customer_note_to_picker:
      raw.customer_note_to_picker ??
      raw.customerNoteToPicker ??
      raw.customer_note ??
      raw.customerNote ??
      null,
    customer_name: raw.customer_name ?? raw.customerName ?? raw.name ?? null,
    customer_phone:
      raw.customer_phone ?? raw.customerPhone ?? raw.phone ?? null,
    customer_notes:
      raw.customer_notes ?? raw.customerNotes ?? raw.notes ?? null,
    fulfillment_method:
      raw.fulfillment_method ?? raw.fulfillmentMethod ?? raw.delivery_method ?? raw.deliveryMethod ?? null,
    delivery_address:
      raw.delivery_address ?? raw.deliveryAddress ?? null,
    delivery_fee:
      raw.delivery_fee === null || raw.delivery_fee === undefined
        ? 0
        : Number(raw.delivery_fee),
    delivery_notes:
      raw.delivery_notes ?? raw.deliveryNotes ?? null,
    price:
      raw.price === null || raw.price === undefined ? null : Number(raw.price),
    payment_method:
      raw.payment_method ?? raw.paymentMethod ?? raw.payment ?? null,
    items: Array.isArray(itemsRaw) ? itemsRaw.map(normalizeItem) : [],
  };
}

export async function getPickerOrders(statuses) {
  const statusParam =
    Array.isArray(statuses) && statuses.length
      ? statuses.join(",")
      : "confirmed,preparing";

  const res = await fetchJSON(
    `/api/dashboard/picker/orders?status=${encodeURIComponent(statusParam)}`,
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

export async function setOrderItemPickerDetails(orderId, itemId, payload) {
  return await fetchJSON(
    `/api/dashboard/picker/orders/${orderId}/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload || {}),
    },
  );
}

function normalizeStockProduct(raw) {
  return {
    id: Number(raw.id),
    shop_id: Number(raw.shop_id ?? raw.shopId ?? getShopId()),
    name: String(raw.name ?? ""),
    display_name_en: String(raw.display_name_en ?? raw.displayNameEn ?? ""),
    price:
      raw.price === null || raw.price === undefined ? null : Number(raw.price),
    stock_amount:
      raw.stock_amount === null || raw.stock_amount === undefined
        ? null
        : Number(raw.stock_amount),
    stock_unit: raw.stock_unit ?? raw.stockUnit ?? null,
    emoji: raw.emoji ?? raw.product_emoji ?? raw.productEmoji ?? null,
    subcategory_emoji:
      raw.subcategory_emoji ?? raw.subcategoryEmoji ?? raw.default_emoji ?? null,
    category: raw.category ?? null,
    sub_category: raw.sub_category ?? raw.subCategory ?? null,
    updated_at: raw.updated_at ?? raw.updatedAt ?? null,
    created_at: raw.created_at ?? raw.createdAt ?? null,
  };
}

export async function getStockCategories() {
  const res = await fetchJSON(`/api/dashboard/stock/categories`);
  return res;
}

export async function getStockProductsPage({
  q,
  category,
  sub_category,
  limit = 40,
  cursor = null,
}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", String(cursor));
  if (q !== undefined && q !== null) params.set("q", String(q));
  if (category) params.set("category", String(category));
  if (sub_category) params.set("sub_category", String(sub_category));

  const res = await fetchJSON(
    `/api/dashboard/stock/products?${params.toString()}`,
  );

  const list = res.products ?? res.data ?? res.items ?? [];

  return {
    products: Array.isArray(list) ? list.map(normalizeStockProduct) : [],
    next_cursor: res.next_cursor ?? res.nextCursor ?? null,
    total_count: res.total_count ?? res.totalCount ?? null,
  };
}

export async function createStockProduct(payload) {
  return await fetchJSON(`/api/dashboard/stock/products`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStockProduct(id, payload) {
  return await fetchJSON(`/api/dashboard/stock/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStockProduct(id) {
  return await fetchJSON(
    `/api/dashboard/stock/products/${id}`,
    { method: "DELETE" },
  );
}

function normalizePromotion(raw) {
  return {
    id: Number(raw.id),
    shop_id: Number(raw.shop_id ?? raw.shopId ?? getShopId()),
    product_id: Number(raw.product_id ?? raw.productId),
    product_name: raw.product_name ?? raw.productName ?? null,
    product_display_name_en:
      raw.product_display_name_en ?? raw.productDisplayNameEn ?? null,
    product_price: toNumberOrNull(raw.product_price ?? raw.productPrice),
    product_category: raw.product_category ?? raw.productCategory ?? null,
    product_sub_category: raw.product_sub_category ?? raw.productSubCategory ?? null,
    kind: String(raw.kind ?? ""),
    percent_off: toNumberOrNull(raw.percent_off ?? raw.percentOff),
    amount_off: toNumberOrNull(raw.amount_off ?? raw.amountOff),
    fixed_price: toNumberOrNull(raw.fixed_price ?? raw.fixedPrice),
    bundle_buy_qty: toNumberOrNull(raw.bundle_buy_qty ?? raw.bundleBuyQty),
    bundle_pay_price: toNumberOrNull(
      raw.bundle_pay_price ?? raw.bundlePayPrice,
    ),
    description: raw.description ?? null,
    start_at: raw.start_at ?? raw.startAt ?? null,
    end_at: raw.end_at ?? raw.endAt ?? null,
    created_at: raw.created_at ?? raw.createdAt ?? null,
    updated_at: raw.updated_at ?? raw.updatedAt ?? null,
    is_active: toBool(raw.is_active ?? raw.isActive, false),
    is_upcoming: toBool(raw.is_upcoming ?? raw.isUpcoming, false),
    is_expired: toBool(raw.is_expired ?? raw.isExpired, false),
    status: raw.status ?? "inactive",
  };
}

export async function getPromotions({
  status = "all",
  q = "",
  category = "",
  sub_category = "",
  sort_by = "default",
  sort_dir = "desc",
} = {}) {
  const params = new URLSearchParams();
  params.set("status", String(status || "all"));
  params.set("limit", "500");
  if (q) params.set("q", String(q));
  if (category) params.set("category", String(category));
  if (sub_category) params.set("sub_category", String(sub_category));
  if (sort_by) params.set("sort_by", String(sort_by));
  if (sort_dir) params.set("sort_dir", String(sort_dir));

  const res = await fetchJSON(`/api/dashboard/promotions?${params.toString()}`);
  const list = res.promotions ?? res.data ?? res.items ?? [];

  return {
    promotions: Array.isArray(list) ? list.map(normalizePromotion) : [],
    counts: {
      total: Number(res.counts?.total ?? list.length ?? 0),
      active: Number(res.counts?.active ?? 0),
      inactive: Number(res.counts?.inactive ?? 0),
    },
  };
}

export async function createPromotion(payload) {
  return await fetchJSON(`/api/dashboard/promotions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePromotion(id, payload) {
  return await fetchJSON(`/api/dashboard/promotions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deletePromotion(id) {
  return await fetchJSON(`/api/dashboard/promotions/${id}`, {
    method: "DELETE",
  });
}


function normalizeBusinessSettings(raw) {
  const info = raw.info ?? raw.shop ?? {};
  return {
    info: {
      shop_id: Number(info.shop_id ?? info.id ?? getShopId()),
      name: info.name ?? "",
      chain_name: info.chain_name ?? info.chainName ?? "",
      branch_name: info.branch_name ?? info.branchName ?? "",
      address: info.address ?? "",
      google_maps_url: info.google_maps_url ?? info.googleMapsUrl ?? "",
      phone: info.phone ?? "",
      whatsapp_phone: info.whatsapp_phone ?? info.whatsappPhone ?? "",
      email: info.email ?? "",
      supports_delivery: toBool(info.supports_delivery ?? info.supportsDelivery, false),
      supports_pickup: toBool(info.supports_pickup ?? info.supportsPickup, true),
      kashrut: info.kashrut ?? "",
      about: info.about ?? "",
      min_order_amount:
        toNumberOrNull(info.min_order_amount ?? info.minOrderAmount) ?? 0,
      min_delivery_order_amount:
        toNumberOrNull(
          info.min_delivery_order_amount ??
            info.minDeliveryOrderAmount ??
            info.min_order_amount ??
            info.minOrderAmount,
        ) ?? 0,
      min_pickup_order_amount:
        toNumberOrNull(
          info.min_pickup_order_amount ??
            info.minPickupOrderAmount ??
            info.min_order_amount ??
            info.minOrderAmount,
        ) ?? 0,
      delivery_fee: toNumberOrNull(info.delivery_fee ?? info.deliveryFee) ?? 0,
      cart_empty_reminder_minutes:
        toNumberOrNull(
          info.cart_empty_reminder_minutes ?? info.cartEmptyReminderMinutes,
        ) ?? 5,
      stock_release_after_inactive_minutes:
        toNumberOrNull(
          info.stock_release_after_inactive_minutes ??
            info.stockReleaseAfterInactiveMinutes,
        ) ?? 30,
      max_order_quantity_per_product:
        toNumberOrNull(
          info.max_order_quantity_per_product ??
            info.maxOrderQuantityPerProduct,
        ) ?? 10,
    },
    regular_hours: Array.isArray(raw.regular_hours) ? raw.regular_hours : [],
    special_hours: Array.isArray(raw.special_hours) ? raw.special_hours : [],
    delivery_zones: Array.isArray(raw.delivery_zones) ? raw.delivery_zones : [],
    delivery_zone_options: Array.isArray(raw.delivery_zone_options) ? raw.delivery_zone_options : [],
  };
}

export async function getBusinessSettings() {
  const res = await fetchJSON(`/api/dashboard/settings/business`);
  return normalizeBusinessSettings(res);
}

export async function updateBusinessSettings(payload) {
  return await fetchJSON(`/api/dashboard/settings/business`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
